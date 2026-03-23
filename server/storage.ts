import { eq, and, desc, gte, lte, sum } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  userAccessControls,
  businessSettings,
  products, 
  sales,
  dailyPayments,
  expenseCategories,
  expenses,
  deliveries,
  deliveryStockEntries,
  deliveryAssignments,
  deliveryAssignmentAuditLogs,
  capitalMovements,
  grossCapitalMovements,
  directors,
  directorExpenses,
  sellers,
  sellerSales,
  type User, 
  type InsertUser,
  type UserAccessControl,
  type InsertUserAccessControl,
  type BusinessSettings,
  type InsertBusinessSettings,
  type Product,
  type InsertProduct,
  type Sale,
  type InsertSale,
  type DailyPayment,
  type InsertDailyPayment,
  type ExpenseCategory,
  type InsertExpenseCategory,
  type Expense,
  type InsertExpense,
  type Delivery,
  type InsertDelivery,
  type DeliveryStockEntry,
  type InsertDeliveryStockEntry,
  type DeliveryAssignment,
  type InsertDeliveryAssignment,
  type DeliveryAssignmentAuditLog,
  type CapitalMovement,
  type InsertCapitalMovement,
  type GrossCapitalMovement,
  type InsertGrossCapitalMovement,
  type Director,
  type InsertDirector,
  type DirectorExpense,
  type InsertDirectorExpense,
  type Seller,
  type InsertSeller,
  type SellerSale,
  type InsertSellerSale
} from "@shared/schema";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

type DeliveryAssignmentAuditPayload = {
  assignmentId: string;
  action: string;
  deliveryId: string;
  productId: string;
  quantity: number;
  unitPriceSnapshot: string;
  note?: string | null;
  assignedAt?: Date | null;
  isPaid: number;
  nextState?: {
    deliveryId: string;
    productId: string;
    quantity: number;
    unitPriceSnapshot: string;
    note?: string | null;
    isPaid: number;
  } | null;
  userId: string;
};

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<Array<{ id: string; name: string; username: string }>>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserName(userId: string, name: string): Promise<User | undefined>;
  verifyPassword(username: string, password: string): Promise<User | null>;
  setUserPassword(userId: string, password: string): Promise<void>;
  getUserAccessControl(userId: string): Promise<UserAccessControl | undefined>;
  upsertUserAccessControl(access: InsertUserAccessControl): Promise<UserAccessControl>;

  // Business Settings
  getBusinessSettings(userId: string): Promise<BusinessSettings | undefined>;
  upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;

  // Products
  getProducts(userId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Sales
  getSales(userId: string): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSaleDate(id: string, saleDate: string): Promise<Sale | undefined>;
  deleteSale(id: string): Promise<boolean>;

  // Daily Payments
  getDailyPayment(userId: string, paymentDate: string): Promise<DailyPayment | undefined>;
  upsertDailyPayment(payment: InsertDailyPayment): Promise<DailyPayment>;

  // Expense Categories
  getExpenseCategories(userId: string): Promise<ExpenseCategory[]>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;

  // Expenses
  getExpenses(userId: string): Promise<Expense[]>;
  getExpensesByDateRange(userId: string, startDate: string, endDate: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, data: { categoryId?: string; expenseDate?: string }): Promise<Expense>;
  deleteExpense(id: string): Promise<boolean>;

  // Deliveries
  getDeliveries(userId: string): Promise<Delivery[]>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;

  // Delivery Stock Entries
  getDeliveryStockEntries(userId: string): Promise<DeliveryStockEntry[]>;
  createDeliveryStockEntry(entry: InsertDeliveryStockEntry): Promise<DeliveryStockEntry>;
  updateDeliveryStockEntry(id: string, data: { productId?: string; quantity?: number; entryDate?: string | null }): Promise<DeliveryStockEntry>;
  deleteDeliveryStockEntry(id: string): Promise<void>;

  // Delivery Assignments
  getDeliveryAssignment(id: string): Promise<DeliveryAssignment | undefined>;
  getDeliveryAssignments(userId: string): Promise<DeliveryAssignment[]>;
  getDeliveryAssignmentsByDateRange(userId: string, startDate: string, endDate: string): Promise<DeliveryAssignment[]>;
  createDeliveryAssignment(assignment: InsertDeliveryAssignment): Promise<DeliveryAssignment>;
  updateDeliveryAssignment(
    id: string,
    data: {
      deliveryId?: string;
      productId?: string;
      quantity?: number;
      unitPriceSnapshot?: string;
      note?: string | null;
    }
  ): Promise<DeliveryAssignment | undefined>;
  deleteDeliveryAssignment(id: string): Promise<boolean>;
  updateDeliveryAssignmentPaid(id: string, isPaid: number): Promise<DeliveryAssignment | undefined>;
  getDeliveryAssignmentAuditLogsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DeliveryAssignmentAuditLog[]>;
  createDeliveryAssignmentAuditLog(log: DeliveryAssignmentAuditPayload): Promise<DeliveryAssignmentAuditLog>;

  // Capital Movements
  getCapitalMovements(userId: string): Promise<CapitalMovement[]>;
  createCapitalMovement(movement: InsertCapitalMovement): Promise<CapitalMovement>;

  // Gross Capital Movements (retiros de capital bruto)
  getGrossCapitalMovements(userId: string): Promise<GrossCapitalMovement[]>;
  createGrossCapitalMovement(movement: InsertGrossCapitalMovement): Promise<GrossCapitalMovement>;
  updateGrossCapitalMovement(id: string, data: { description?: string; amount?: string; movementDate?: string }): Promise<GrossCapitalMovement | undefined>;
  deleteGrossCapitalMovement(id: string): Promise<boolean>;

  // Directors
  getDirector(id: string): Promise<Director | undefined>;
  getDirectors(userId: string): Promise<Director[]>;
  createDirector(director: InsertDirector): Promise<Director>;
  updateDirectorReportVisibility(id: string, userId: string, showProfitInReport: number): Promise<Director | undefined>;

  // Director Expenses
  getDirectorExpense(id: string): Promise<DirectorExpense | undefined>;
  getDirectorExpenses(userId: string): Promise<DirectorExpense[]>;
  createDirectorExpense(expense: InsertDirectorExpense): Promise<DirectorExpense>;
  deleteDirectorExpense(id: string, userId: string): Promise<boolean>;

  // Sellers
  getSeller(id: string): Promise<Seller | undefined>;
  getSellers(userId: string): Promise<Seller[]>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSellerDirector(
    sellerId: string,
    userId: string,
    data: { directorId?: string | null; directorAssignedFrom?: string | null },
  ): Promise<Seller | undefined>;
  updateSellerSalesDirectorFromDate(
    sellerId: string,
    userId: string,
    directorId: string | null,
    effectiveFrom: string,
  ): Promise<number>;

  // Seller Sales
  getSellerSale(id: string): Promise<SellerSale | undefined>;
  getSellerSales(userId: string): Promise<SellerSale[]>;
  createSellerSale(sale: InsertSellerSale): Promise<SellerSale>;
  updateSellerSale(id: string, data: { productId?: string; quantity?: number; unitPrice?: string }): Promise<SellerSale | undefined>;
  deleteSellerSale(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getAllUsers(): Promise<Array<{ id: string; name: string; username: string }>> {
    return db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
      })
      .from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const result = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return result[0];
  }

  async updateUserName(userId: string, name: string): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ name })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async setUserPassword(userId: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  async getUserAccessControl(userId: string): Promise<UserAccessControl | undefined> {
    const result = await db
      .select()
      .from(userAccessControls)
      .where(eq(userAccessControls.userId, userId));
    return result[0];
  }

  async upsertUserAccessControl(access: InsertUserAccessControl): Promise<UserAccessControl> {
    const existing = await this.getUserAccessControl(access.userId);
    const role = (access.role || existing?.role || "viewer").trim();
    const roleKey = role.toLowerCase();
    const permissions = access.permissions || null;
    const visibleFrom =
      access.visibleFrom ??
      (roleKey === "contador"
        ? existing?.visibleFrom || new Date().toISOString().slice(0, 10)
        : existing?.visibleFrom || null);
    const commissionRate =
      access.commissionRate ||
      existing?.commissionRate ||
      (roleKey === "contador" ? "0.1000" : "0.0000");
    const commissionSeller = access.commissionSeller || existing?.commissionSeller || "Jose Eduardo";

    if (existing) {
      const result = await db
        .update(userAccessControls)
        .set({
          role,
          permissions,
          visibleFrom,
          commissionRate,
          commissionSeller,
          updatedAt: new Date(),
        })
        .where(eq(userAccessControls.userId, access.userId))
        .returning();
      return result[0];
    }

    const result = await db
      .insert(userAccessControls)
      .values({
        userId: access.userId,
        role,
        permissions,
        visibleFrom,
        commissionRate,
        commissionSeller,
      })
      .returning();
    return result[0];
  }

  // Business Settings
  async getBusinessSettings(userId: string): Promise<BusinessSettings | undefined> {
    const result = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.userId, userId));
    return result[0];
  }

  async upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings(settings.userId);

    if (existing) {
      const result = await db
        .update(businessSettings)
        .set({
          businessName: settings.businessName,
          logoUrl: settings.logoUrl ?? null,
          currency: settings.currency,
          timeZone: settings.timeZone,
          dateFormat: settings.dateFormat,
          updatedAt: new Date(),
        })
        .where(eq(businessSettings.userId, settings.userId))
        .returning();
      return result[0];
    }

    const result = await db
      .insert(businessSettings)
      .values({
        userId: settings.userId,
        businessName: settings.businessName,
        logoUrl: settings.logoUrl ?? null,
        currency: settings.currency,
        timeZone: settings.timeZone,
        dateFormat: settings.dateFormat,
      })
      .returning();
    return result[0];
  }

  // Products
  async getProducts(userId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const values = product as typeof products.$inferInsert;
    const result = await db.insert(products).values(values).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const updates = product as Partial<typeof products.$inferInsert>;
    const result = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // Sales
  async getSales(userId: string): Promise<Sale[]> {
    return db.select().from(sales).where(eq(sales.userId, userId)).orderBy(desc(sales.saleDate));
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.id, id));
    return result[0];
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const result = await db.insert(sales).values(sale).returning();
    return result[0];
  }

  async updateSaleDate(id: string, saleDate: string): Promise<Sale | undefined> {
    const result = await db
      .update(sales)
      .set({ saleDate })
      .where(eq(sales.id, id))
      .returning();
    return result[0];
  }

  async deleteSale(id: string): Promise<boolean> {
    const result = await db.delete(sales).where(eq(sales.id, id)).returning();
    return result.length > 0;
  }

  // Daily Payments
  async getDailyPayment(userId: string, paymentDate: string): Promise<DailyPayment | undefined> {
    const result = await db
      .select()
      .from(dailyPayments)
      .where(and(eq(dailyPayments.userId, userId), eq(dailyPayments.paymentDate, paymentDate)));
    return result[0];
  }

  async upsertDailyPayment(payment: InsertDailyPayment): Promise<DailyPayment> {
    const existing = await this.getDailyPayment(payment.userId, payment.paymentDate);
    
    if (existing) {
      const result = await db
        .update(dailyPayments)
        .set(payment)
        .where(eq(dailyPayments.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(dailyPayments).values(payment).returning();
      return result[0];
    }
  }

  // Expense Categories
  async getExpenseCategories(userId: string): Promise<ExpenseCategory[]> {
    return db.select().from(expenseCategories).where(eq(expenseCategories.userId, userId)).orderBy(desc(expenseCategories.createdAt));
  }

  async createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory> {
    const result = await db.insert(expenseCategories).values(category).returning();
    return result[0];
  }

  // Expenses
  async getExpenses(userId: string): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.expenseDate));
  }

  async getExpensesByDateRange(userId: string, startDate: string, endDate: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(expense).returning();
    return result[0];
  }

  async updateExpense(id: string, data: { categoryId?: string; expenseDate?: string }): Promise<Expense> {
    const result = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  // Deliveries
  async getDeliveries(userId: string): Promise<Delivery[]> {
    return db.select().from(deliveries).where(eq(deliveries.userId, userId)).orderBy(desc(deliveries.createdAt));
  }

  async createDelivery(delivery: InsertDelivery): Promise<Delivery> {
    const result = await db.insert(deliveries).values(delivery).returning();
    return result[0];
  }

  // Delivery Stock Entries
  async getDeliveryStockEntries(userId: string): Promise<DeliveryStockEntry[]> {
    return db.select().from(deliveryStockEntries).where(eq(deliveryStockEntries.userId, userId)).orderBy(desc(deliveryStockEntries.recordedAt));
  }

  async createDeliveryStockEntry(entry: InsertDeliveryStockEntry): Promise<DeliveryStockEntry> {
    const result = await db.insert(deliveryStockEntries).values(entry).returning();
    return result[0];
  }

  async updateDeliveryStockEntry(id: string, data: { productId?: string; quantity?: number; entryDate?: string | null }): Promise<DeliveryStockEntry> {
    const result = await db.update(deliveryStockEntries).set(data).where(eq(deliveryStockEntries.id, id)).returning();
    return result[0];
  }

  async deleteDeliveryStockEntry(id: string): Promise<void> {
    await db.delete(deliveryStockEntries).where(eq(deliveryStockEntries.id, id));
  }

  // Delivery Assignments
  async getDeliveryAssignment(id: string): Promise<DeliveryAssignment | undefined> {
    const result = await db.select().from(deliveryAssignments).where(eq(deliveryAssignments.id, id));
    return result[0];
  }

  async getDeliveryAssignments(userId: string): Promise<DeliveryAssignment[]> {
    return db.select().from(deliveryAssignments).where(eq(deliveryAssignments.userId, userId)).orderBy(desc(deliveryAssignments.assignedAt));
  }

  async getDeliveryAssignmentsByDateRange(userId: string, startDate: string, endDate: string): Promise<DeliveryAssignment[]> {
    const start = new Date(`${startDate}T00:00:00.000`);
    const end = new Date(`${endDate}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Invalid date range for delivery assignments report");
    }

    return db
      .select()
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.userId, userId),
          gte(deliveryAssignments.assignedAt, start),
          lte(deliveryAssignments.assignedAt, end)
        )
      )
      .orderBy(desc(deliveryAssignments.assignedAt));
  }

  async createDeliveryAssignment(assignment: InsertDeliveryAssignment): Promise<DeliveryAssignment> {
    const result = await db.insert(deliveryAssignments).values(assignment).returning();
    return result[0];
  }

  async updateDeliveryAssignment(
    id: string,
    data: {
      deliveryId?: string;
      productId?: string;
      quantity?: number;
      unitPriceSnapshot?: string;
      note?: string | null;
    }
  ): Promise<DeliveryAssignment | undefined> {
    const result = await db
      .update(deliveryAssignments)
      .set(data)
      .where(eq(deliveryAssignments.id, id))
      .returning();
    return result[0];
  }

  async deleteDeliveryAssignment(id: string): Promise<boolean> {
    const result = await db.delete(deliveryAssignments).where(eq(deliveryAssignments.id, id)).returning();
    return result.length > 0;
  }

  async updateDeliveryAssignmentPaid(id: string, isPaid: number): Promise<DeliveryAssignment | undefined> {
    const result = await db
      .update(deliveryAssignments)
      .set({ isPaid })
      .where(eq(deliveryAssignments.id, id))
      .returning();
    return result[0];
  }

  async getDeliveryAssignmentAuditLogsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DeliveryAssignmentAuditLog[]> {
    const start = new Date(`${startDate}T00:00:00.000`);
    const end = new Date(`${endDate}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Invalid date range for delivery assignment audit");
    }

    return db
      .select()
      .from(deliveryAssignmentAuditLogs)
      .where(
        and(
          eq(deliveryAssignmentAuditLogs.userId, userId),
          gte(deliveryAssignmentAuditLogs.createdAt, start),
          lte(deliveryAssignmentAuditLogs.createdAt, end)
        )
      )
      .orderBy(desc(deliveryAssignmentAuditLogs.createdAt));
  }

  async createDeliveryAssignmentAuditLog(
    log: DeliveryAssignmentAuditPayload
  ): Promise<DeliveryAssignmentAuditLog> {
    const result = await db.insert(deliveryAssignmentAuditLogs).values(log).returning();
    return result[0];
  }

  // Capital Movements
  async getCapitalMovements(userId: string): Promise<CapitalMovement[]> {
    return db.select().from(capitalMovements).where(eq(capitalMovements.userId, userId)).orderBy(desc(capitalMovements.movementDate));
  }

  async createCapitalMovement(movement: InsertCapitalMovement): Promise<CapitalMovement> {
    const result = await db.insert(capitalMovements).values(movement).returning();
    return result[0];
  }

  // Gross Capital Movements
  async getGrossCapitalMovements(userId: string): Promise<GrossCapitalMovement[]> {
    return db.select().from(grossCapitalMovements).where(eq(grossCapitalMovements.userId, userId)).orderBy(desc(grossCapitalMovements.movementDate));
  }

  async createGrossCapitalMovement(movement: InsertGrossCapitalMovement): Promise<GrossCapitalMovement> {
    const result = await db.insert(grossCapitalMovements).values(movement).returning();
    return result[0];
  }

  async updateGrossCapitalMovement(id: string, data: { description?: string; amount?: string; movementDate?: string }): Promise<GrossCapitalMovement | undefined> {
    const result = await db.update(grossCapitalMovements).set(data).where(eq(grossCapitalMovements.id, id)).returning();
    return result[0];
  }

  async deleteGrossCapitalMovement(id: string): Promise<boolean> {
    const result = await db.delete(grossCapitalMovements).where(eq(grossCapitalMovements.id, id)).returning();
    return result.length > 0;
  }

  // Directors
  async getDirector(id: string): Promise<Director | undefined> {
    const result = await db.select().from(directors).where(eq(directors.id, id));
    return result[0];
  }

  async getDirectors(userId: string): Promise<Director[]> {
    return db.select().from(directors).where(eq(directors.userId, userId)).orderBy(desc(directors.createdAt));
  }

  async createDirector(director: InsertDirector): Promise<Director> {
    const result = await db.insert(directors).values(director).returning();
    return result[0];
  }

  async updateDirectorReportVisibility(id: string, userId: string, showProfitInReport: number): Promise<Director | undefined> {
    const result = await db
      .update(directors)
      .set({ showProfitInReport })
      .where(and(eq(directors.id, id), eq(directors.userId, userId)))
      .returning();
    return result[0];
  }

  // Director Expenses
  async getDirectorExpense(id: string): Promise<DirectorExpense | undefined> {
    const result = await db.select().from(directorExpenses).where(eq(directorExpenses.id, id));
    return result[0];
  }

  async getDirectorExpenses(userId: string): Promise<DirectorExpense[]> {
    return db.select().from(directorExpenses).where(eq(directorExpenses.userId, userId)).orderBy(desc(directorExpenses.expenseDate));
  }

  async createDirectorExpense(expense: InsertDirectorExpense): Promise<DirectorExpense> {
    const result = await db.insert(directorExpenses).values(expense).returning();
    return result[0];
  }

  async deleteDirectorExpense(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(directorExpenses)
      .where(and(eq(directorExpenses.id, id), eq(directorExpenses.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // Sellers
  async getSeller(id: string): Promise<Seller | undefined> {
    const result = await db.select().from(sellers).where(eq(sellers.id, id));
    return result[0];
  }

  async getSellers(userId: string): Promise<Seller[]> {
    return db.select().from(sellers).where(eq(sellers.userId, userId)).orderBy(desc(sellers.createdAt));
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const result = await db.insert(sellers).values(seller).returning();
    return result[0];
  }

  async updateSellerDirector(
    sellerId: string,
    userId: string,
    data: { directorId?: string | null; directorAssignedFrom?: string | null },
  ): Promise<Seller | undefined> {
    const result = await db
      .update(sellers)
      .set(data)
      .where(and(eq(sellers.id, sellerId), eq(sellers.userId, userId)))
      .returning();
    return result[0];
  }

  async updateSellerSalesDirectorFromDate(
    sellerId: string,
    userId: string,
    directorId: string | null,
    effectiveFrom: string,
  ): Promise<number> {
    const result = await db
      .update(sellerSales)
      .set({ directorId })
      .where(
        and(
          eq(sellerSales.sellerId, sellerId),
          eq(sellerSales.userId, userId),
          gte(sellerSales.saleDate, effectiveFrom),
        ),
      )
      .returning({ id: sellerSales.id });
    return result.length;
  }

  // Seller Sales
  async getSellerSale(id: string): Promise<SellerSale | undefined> {
    const result = await db.select().from(sellerSales).where(eq(sellerSales.id, id));
    return result[0];
  }

  async getSellerSales(userId: string): Promise<SellerSale[]> {
    return db.select().from(sellerSales).where(eq(sellerSales.userId, userId)).orderBy(desc(sellerSales.saleDate));
  }

  async createSellerSale(sale: InsertSellerSale): Promise<SellerSale> {
    const result = await db.insert(sellerSales).values(sale).returning();
    return result[0];
  }

  async updateSellerSale(id: string, data: { productId?: string; quantity?: number; unitPrice?: string }): Promise<SellerSale | undefined> {
    const result = await db.update(sellerSales).set(data).where(eq(sellerSales.id, id)).returning();
    return result[0];
  }

  async deleteSellerSale(id: string): Promise<boolean> {
    const result = await db.delete(sellerSales).where(eq(sellerSales.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();

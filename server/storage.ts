import { eq, and, desc, gte, lte, sum } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  products, 
  sales,
  dailyPayments,
  expenseCategories,
  expenses,
  deliveries,
  deliveryStockEntries,
  deliveryAssignments,
  type User, 
  type InsertUser,
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
  type InsertDeliveryAssignment
} from "@shared/schema";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(username: string, password: string): Promise<User | null>;

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

  // Deliveries
  getDeliveries(userId: string): Promise<Delivery[]>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;

  // Delivery Stock Entries
  getDeliveryStockEntries(userId: string): Promise<DeliveryStockEntry[]>;
  createDeliveryStockEntry(entry: InsertDeliveryStockEntry): Promise<DeliveryStockEntry>;

  // Delivery Assignments
  getDeliveryAssignments(userId: string): Promise<DeliveryAssignment[]>;
  getDeliveryAssignmentsByDateRange(userId: string, startDate: string, endDate: string): Promise<DeliveryAssignment[]>;
  createDeliveryAssignment(assignment: InsertDeliveryAssignment): Promise<DeliveryAssignment>;
  updateDeliveryAssignmentPaid(id: string, isPaid: number): Promise<DeliveryAssignment | undefined>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
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

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
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
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db
      .update(products)
      .set(product)
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

  // Delivery Assignments
  async getDeliveryAssignments(userId: string): Promise<DeliveryAssignment[]> {
    return db.select().from(deliveryAssignments).where(eq(deliveryAssignments.userId, userId)).orderBy(desc(deliveryAssignments.assignedAt));
  }

  async getDeliveryAssignmentsByDateRange(userId: string, startDate: string, endDate: string): Promise<DeliveryAssignment[]> {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    return db
      .select()
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.userId, userId),
          gte(deliveryAssignments.assignedAt, start.toISOString()),
          lte(deliveryAssignments.assignedAt, end.toISOString())
        )
      )
      .orderBy(desc(deliveryAssignments.assignedAt));
  }

  async createDeliveryAssignment(assignment: InsertDeliveryAssignment): Promise<DeliveryAssignment> {
    const result = await db.insert(deliveryAssignments).values(assignment).returning();
    return result[0];
  }

  async updateDeliveryAssignmentPaid(id: string, isPaid: number): Promise<DeliveryAssignment | undefined> {
    const result = await db
      .update(deliveryAssignments)
      .set({ isPaid })
      .where(eq(deliveryAssignments.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();

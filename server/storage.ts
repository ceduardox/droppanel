import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  products, 
  sales,
  dailyPayments,
  type User, 
  type InsertUser,
  type Product,
  type InsertProduct,
  type Sale,
  type InsertSale,
  type DailyPayment,
  type InsertDailyPayment
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
}

export const storage = new DbStorage();

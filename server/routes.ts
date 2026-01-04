import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertUserSchema, insertProductSchema, insertSaleSchema, insertDailyPaymentSchema, insertExpenseCategorySchema, insertExpenseSchema, insertDeliverySchema, insertDeliveryStockEntrySchema, insertDeliveryAssignmentSchema, insertCapitalMovementSchema, insertGrossCapitalMovementSchema, insertSellerSchema, insertSellerSaleSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: true,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse({
        ...req.body,
        username: req.body.username?.trim(),
        name: req.body.name?.trim(),
      });
      
      // Check if user exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      const user = await storage.createUser(data);
      req.session.userId = user.id;
      
      // Guardar sesión antes de enviar respuesta
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      res.json({ 
        id: user.id, 
        name: user.name,
        username: user.username 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear usuario" });
    }
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
      
      // Admin impersonation: "arely" sees all data from "Jhonattan"
      if (username?.trim().toLowerCase() === "arely") {
        const jhonattanUser = await storage.getUserByUsername("Jhonattan");
        if (jhonattanUser) {
          req.session.impersonateUserId = jhonattanUser.id;
          req.session.isAdmin = true;
        }
      }
      
      // Guardar sesión antes de enviar respuesta
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      res.json({ 
        id: user.id, 
        name: user.name,
        username: user.username,
        isAdmin: req.session.isAdmin || false
      });
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
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json({ 
        id: user.id, 
        name: user.name,
        username: user.username,
        isAdmin: req.session.isAdmin || false
      });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener usuario" });
    }
  });

  // Product routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts(getEffectiveUserId(req));
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });

  app.post("/api/products", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const { name, price, baseCost, capitalIncrease } = req.body;
      
      // Calcular cost total
      const base = parseFloat(baseCost || '0');
      const capital = parseFloat(capitalIncrease || '0');
      const cost = base + capital;
      
      let imageUrl: string | undefined;
      
      if (req.file) {
        const objectStorage = new Client({
          bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID
        });
        
        const filename = `products/${Date.now()}-${req.file.originalname}`;
        const { ok } = await objectStorage.uploadFromBytes(filename, req.file.buffer);
        
        if (ok) {
          imageUrl = filename;
        }
      }
      
      const product = await storage.createProduct({
        name,
        price,
        cost: cost.toString(),
        baseCost: baseCost || null,
        capitalIncrease: capitalIncrease || null,
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
      const { id } = req.params;
      const { name, price, baseCost, capitalIncrease } = req.body;
      
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct || existingProduct.userId !== getEffectiveUserId(req)) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      // Calcular cost total
      const base = parseFloat(baseCost || '0');
      const capital = parseFloat(capitalIncrease || '0');
      const cost = base + capital;

      let imageUrl = existingProduct.imageUrl;
      
      if (req.file) {
        const objectStorage = new Client({
          bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID
        });
        
        const filename = `products/${Date.now()}-${req.file.originalname}`;
        const { ok } = await objectStorage.uploadFromBytes(filename, req.file.buffer);
        
        if (ok) {
          imageUrl = filename;
        }
      }
      
      const product = await storage.updateProduct(id, {
        name,
        price,
        cost: cost.toString(),
        baseCost: baseCost || null,
        capitalIncrease: capitalIncrease || null,
        imageUrl,
      });
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar producto" });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
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
      const sales = await storage.getSales(getEffectiveUserId(req));
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      const { productId, quantity, date } = req.body;
      
      const product = await storage.getProduct(productId);
      
      if (!product || product.userId !== getEffectiveUserId(req)) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const sale = await storage.createSale({
        productId,
        quantity: parseInt(quantity),
        saleDate: date,
        userId: getEffectiveUserId(req),
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
      const objectStorage = new Client({
        bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID
      });
      const { path } = req.params;
      const result = await objectStorage.downloadAsBytes(path);
      
      if (!result.ok) {
        return res.status(404).json({ error: "Imagen no encontrada" });
      }
      
      // Determine content type based on file extension
      const ext = path.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      
      res.setHeader('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
      res.send(Buffer.from(result.value[0]));
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ error: "Error al obtener imagen" });
    }
  });

  // Daily payments routes
  app.get("/api/daily-payment/:date", requireAuth, async (req, res) => {
    try {
      const { date } = req.params;
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
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const objectStorage = new Client({
        bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID
      });
      let imageComisionUrl: string | undefined;
      let imageCostoUrl: string | undefined;

      // Upload comision image if provided
      if (files?.imageComision?.[0]) {
        const file = files.imageComision[0];
        const filename = `payments/${Date.now()}-comision-${file.originalname}`;
        const { ok } = await objectStorage.uploadFromBytes(filename, file.buffer);
        if (ok) {
          imageComisionUrl = filename;
        }
      }

      // Upload costo image if provided
      if (files?.imageCosto?.[0]) {
        const file = files.imageCosto[0];
        const filename = `payments/${Date.now()}-costo-${file.originalname}`;
        const { ok } = await objectStorage.uploadFromBytes(filename, file.buffer);
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
      const { id } = req.params;
      const { saleDate } = req.body;
      
      if (!saleDate) {
        return res.status(400).json({ error: "Se requiere la fecha" });
      }

      const sale = await storage.updateSaleDate(id, saleDate);
      if (!sale) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la fecha" });
    }
  });

  app.delete("/api/sales/:id", requireAuth, async (req, res) => {
    try {
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
      const sales = await storage.getSales(getEffectiveUserId(req));
      const products = await storage.getProducts(getEffectiveUserId(req));
      
      const productMap = new Map(products.map(p => [p.id, p]));
      
      const salesWithDetails = sales.map(sale => {
        const product = productMap.get(sale.productId);
        // Normalize date to YYYY-MM-DD format
        const dateValue: any = sale.saleDate;
        const saleDate = dateValue instanceof Date 
          ? dateValue.toISOString().split('T')[0]
          : typeof dateValue === 'string' && dateValue.includes('T')
            ? dateValue.split('T')[0]
            : dateValue;
        return {
          ...sale,
          saleDate,
          product,
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

  // Expenses routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getExpenses(getEffectiveUserId(req));
      const categories = await storage.getExpenseCategories(getEffectiveUserId(req));
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      const expensesWithCategory = expenses.map(expense => ({
        ...expense,
        category: categoryMap.get(expense.categoryId) || "Sin categoría",
      }));
      res.json(expensesWithCategory);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener gastos" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const data = insertExpenseSchema.parse({
        ...req.body,
        userId: getEffectiveUserId(req),
      });
      const expense = await storage.createExpense(data);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
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

  // Expenses summary with date filter
  app.get("/api/expenses/summary", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
      }

      const expenses = await storage.getExpensesByDateRange(
        getEffectiveUserId(req),
        startDate as string,
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
      const entries = await storage.getDeliveryStockEntries(getEffectiveUserId(req));
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener entradas de stock" });
    }
  });

  app.post("/api/delivery-stock", requireAuth, async (req, res) => {
    try {
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
      const { id } = req.params;
      const { productId, quantity, entryDate } = req.body;
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
      const assignments = await storage.getDeliveryAssignments(getEffectiveUserId(req));
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener asignaciones" });
    }
  });

  app.post("/api/delivery-assignments", requireAuth, async (req, res) => {
    try {
      const data = insertDeliveryAssignmentSchema.parse({
        ...req.body,
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

  // Delivery Assignments Report
  app.get("/api/delivery-assignments/report", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
      }

      const assignments = await storage.getDeliveryAssignmentsByDateRange(
        getEffectiveUserId(req),
        startDate as string,
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
      res.status(500).json({ error: "Error al generar reporte de deliveries" });
    }
  });

  // Capital Movements routes
  app.get("/api/capital-movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getCapitalMovements(getEffectiveUserId(req));
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener movimientos de capital" });
    }
  });

  app.post("/api/capital-movements", requireAuth, upload.single("image"), async (req, res) => {
    try {
      let imageUrl = null;
      
      if (req.file) {
        const objectStorage = new Client({
          bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!,
        });
        const fileName = `capital/${Date.now()}-${req.file.originalname}`;
        await objectStorage.uploadFromBytes(fileName, req.file.buffer);
        imageUrl = fileName;
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
      const movements = await storage.getGrossCapitalMovements(getEffectiveUserId(req));
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener movimientos de capital bruto" });
    }
  });

  app.post("/api/gross-capital-movements", requireAuth, upload.single("image"), async (req, res) => {
    try {
      let imageUrl = null;
      
      if (req.file) {
        const objectStorage = new Client({
          bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!,
        });
        const fileName = `gross-capital/${Date.now()}-${req.file.originalname}`;
        await objectStorage.uploadFromBytes(fileName, req.file.buffer);
        imageUrl = fileName;
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

  // Seller Sales routes
  app.get("/api/seller-sales", requireAuth, async (req, res) => {
    try {
      const sales = await storage.getSellerSales(getEffectiveUserId(req));
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas de vendedores" });
    }
  });

  app.post("/api/seller-sales", requireAuth, async (req, res) => {
    try {
      const data = insertSellerSaleSchema.parse({
        sellerId: req.body.sellerId,
        productId: req.body.productId,
        quantity: parseInt(req.body.quantity),
        unitPrice: req.body.unitPrice,
        saleDate: req.body.saleDate,
        userId: getEffectiveUserId(req),
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
      const { productId, quantity, unitPrice } = req.body;
      const sale = await storage.updateSellerSale(id, { 
        productId, 
        quantity: quantity ? parseInt(quantity) : undefined, 
        unitPrice 
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

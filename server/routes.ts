import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertUserSchema, insertProductSchema, insertSaleSchema, insertDailyPaymentSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import path from "path";
import fs from "fs/promises";
import { Client } from "@replit/object-storage";

// Configure session
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Configure multer for image uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
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
        username: user.username 
      });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener usuario" });
    }
  });

  // Product routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts(req.session.userId!);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });

  app.post("/api/products", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const { name, price, cost } = req.body;
      
      let imageUrl: string | undefined;
      
      if (req.file) {
        // Save to object storage (for now, save locally - will integrate object storage later)
        const uploadsDir = path.join(process.cwd(), "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const filename = `${Date.now()}-${req.file.originalname}`;
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, req.file.buffer);
        
        imageUrl = `/uploads/${filename}`;
      }
      
      const product = await storage.createProduct({
        name,
        price,
        cost,
        imageUrl,
        userId: req.session.userId!,
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
      const { name, price, cost } = req.body;
      
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct || existingProduct.userId !== req.session.userId) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      let imageUrl = existingProduct.imageUrl;
      
      if (req.file) {
        const uploadsDir = path.join(process.cwd(), "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const filename = `${Date.now()}-${req.file.originalname}`;
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, req.file.buffer);
        
        imageUrl = `/uploads/${filename}`;
      }
      
      const product = await storage.updateProduct(id, {
        name,
        price,
        cost,
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
      if (!product || product.userId !== req.session.userId) {
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
      const sales = await storage.getSales(req.session.userId!);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      const { productId, quantity, date } = req.body;
      
      const product = await storage.getProduct(productId);
      
      if (!product || product.userId !== req.session.userId) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const sale = await storage.createSale({
        productId,
        quantity: parseInt(quantity),
        saleDate: date,
        userId: req.session.userId!,
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
      const payment = await storage.getDailyPayment(req.session.userId!, date);
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
      const existing = await storage.getDailyPayment(req.session.userId!, paymentDate);
      
      const payment = await storage.upsertDailyPayment({
        paymentDate,
        imageComisionUrl: imageComisionUrl || existing?.imageComisionUrl,
        imageCostoUrl: imageCostoUrl || existing?.imageCostoUrl,
        isPaid: parseInt(isPaid || '0'),
        userId: req.session.userId!,
      });

      res.json(payment);
    } catch (error) {
      console.error("Error saving payment:", error);
      res.status(500).json({ error: "Error al guardar pago" });
    }
  });

  // Reports route - get sales with product details
  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const sales = await storage.getSales(req.session.userId!);
      const products = await storage.getProducts(req.session.userId!);
      
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

  const httpServer = createServer(app);
  return httpServer;
}

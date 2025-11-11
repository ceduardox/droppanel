# Sistema de Gestión de Ventas

## Descripción del Proyecto
Sistema web para gestión de ventas con registro de usuarios, catálogo de productos, registro de ventas y generación de reportes con cálculo automático de utilidades divididas 50/50 entre dos socios (José Eduardo y Jhonatan).

## Características Principales
- **Autenticación**: Registro y login de usuarios con contraseñas encriptadas
  - **Acceso Admin**: Usuario especial "arely" (contraseña: @Omega2020) puede visualizar todos los datos del usuario "Jhonattan" sin opción de "Ventas" en el menú
- **Gestión de Productos**: Agregar, **editar** y eliminar productos con imágenes, precios y costos
  - **Desglose de Costos**: Separación entre "Costo Bruto" y "Aumento de Capital" con cálculo automático del total
- **Registro de Ventas**: Registrar ventas por fecha y cantidad con cálculo automático de utilidades
- **Reportes Detallados**: Visualización de ventas con desglose de costos y ganancias
- **Distribución de Utilidades**: Cálculo automático 50/50 entre José Eduardo y Jhonatan
- **Filtro por Fecha**: Filtrar ventas y reportes por fecha específica
- **Comprobantes de Pago**: Subir comprobantes de comisión y pago de producto por día, marcar como pagado
- **WhatsApp**: Generación de reporte en texto formateado listo para compartir por WhatsApp con desglose de costos

## Arquitectura Técnica

### Frontend
- React con TypeScript
- Wouter para enrutamiento
- TanStack Query para manejo de estado y API
- Shadcn UI + Tailwind CSS para componentes
- Soporte para modo claro/oscuro
- Flag `isAdmin` en sistema de autenticación para control dinámico del menú sidebar

### Backend
- Express.js con TypeScript
- PostgreSQL (Neon) para persistencia
- Express Session para autenticación con soporte de impersonación admin
  - Helper `getEffectiveUserId()` usado en todos los endpoints para manejo de permisos
  - Limpieza automática de flags de admin al inicio de cada login
- Bcrypt para encriptación de contraseñas
- Multer para carga de imágenes
- Replit Object Storage para almacenamiento de comprobantes

### Base de Datos
**Tablas:**
- `users`: Usuarios del sistema (id, name, username, password)
- `products`: Catálogo de productos (id, name, price, cost, baseCost, capitalIncrease, imageUrl, userId)
- `sales`: Registro de ventas (id, productId, quantity, saleDate, userId)
- `daily_payments`: Comprobantes de pago diarios (id, paymentDate, imageComisionUrl, imageCostoUrl, isPaid, userId)

## Estructura del Proyecto
```
client/
  src/
    components/     # Componentes reutilizables
    pages/         # Páginas de la aplicación
    lib/           # Utilidades y hooks
server/
  db.ts           # Configuración de base de datos
  storage.ts      # Capa de acceso a datos
  routes.ts       # Definición de API endpoints
shared/
  schema.ts       # Esquemas compartidos (Drizzle + Zod)
```

## Flujo de Usuario

### 1. Autenticación
- Usuario se registra con nombre, usuario y contraseña
- Login valida credenciales y crea sesión
- **Login Admin (usuario "arely")**:
  - Al hacer login, el sistema detecta username "arely"
  - Establece impersonación automática hacia el usuario "Jhonattan"
  - El admin ve todos los productos, ventas, reportes y comprobantes de Jhonattan
  - El menú lateral NO muestra la opción "Ventas" para el admin
  - Acceso de solo lectura: puede visualizar pero no registrar ventas

### 2. Gestión de Productos
- Agregar productos con nombre, precio de venta y foto opcional
- Desglose de costo en dos componentes:
  - **Costo Bruto**: Costo base del producto
  - **Aumento de Capital**: Incremento adicional
  - **Costo Total**: Se calcula automáticamente (bruto + capital)
- Ver lista de productos con:
  - Desglose visual de costos (si están disponibles)
  - Cálculo de utilidad por unidad
- Editar o eliminar productos existentes

### 3. Registro de Ventas
- Seleccionar producto del catálogo
- Ingresar cantidad vendida y fecha
- Sistema calcula automáticamente:
  - Total de venta (precio × cantidad)
  - Costo total (costo × cantidad)
  - Utilidad total (venta - costo)
  - Distribución 50/50 entre socios

### 4. Reportes y Comprobantes
- Ver todas las ventas registradas
- Filtrar ventas por fecha específica
- Desglose detallado por venta
- Resumen total acumulado
- Generar texto formateado para WhatsApp con:
  - Detalle de cada venta
  - Totales generales
  - Distribución de utilidad por socio
- Gestión de comprobantes de pago por día:
  - Subir comprobante de comisión José Eduardo
  - Subir comprobante de pago de producto
  - Marcar día como pagado
  - Indicador visual de estado de pago

## Cálculo de Utilidades

Para cada venta:
```
Total Venta = Precio Unitario × Cantidad
Costo Total = Costo Unitario × Cantidad
Utilidad = Total Venta - Costo Total

José Eduardo = Utilidad ÷ 2
Jhonatan = Utilidad ÷ 2
```

**Ejemplo con Berberina:**
- Precio: 130 Bs
- Costo: 46.48 Bs
- Cantidad: 9 unidades

```
Total Venta = 130 × 9 = 1,170 Bs
Costo Total = 46.48 × 9 = 418.32 Bs
Utilidad = 1,170 - 418.32 = 751.68 Bs

José Eduardo = 375.84 Bs
Jhonatan = 375.84 Bs
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Productos
- `GET /api/products` - Listar productos del usuario
- `POST /api/products` - Crear producto (con imagen)
- `PUT /api/products/:id` - Actualizar producto (nombre, precio, costo, imagen opcional)
- `DELETE /api/products/:id` - Eliminar producto

### Ventas
- `GET /api/sales` - Listar ventas del usuario
- `POST /api/sales` - Registrar nueva venta

### Reportes
- `GET /api/reports` - Obtener ventas con detalles de productos

### Comprobantes de Pago
- `GET /api/daily-payment/:date` - Obtener comprobante de pago para una fecha
- `POST /api/daily-payment` - Subir/actualizar comprobantes e indicador de pago

## Variables de Entorno
- `DATABASE_URL` - Conexión a PostgreSQL
- `SESSION_SECRET` - Secreto para sesiones
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - ID del bucket de object storage
- `PORT` - Puerto del servidor (default: 5000)

## Comandos Principales
```bash
npm run dev          # Iniciar desarrollo
npm run build        # Compilar para producción
npm run db:push      # Sincronizar esquema de BD
```

## Cambios Recientes

### Sistema Admin Arely (Noviembre 2025)
- **NUEVA FUNCIONALIDAD**: Acceso admin simplificado para visualización de datos
- Credenciales admin: usuario "arely", contraseña "@Omega2020"
- Backend: Login detecta "arely" y establece impersonación hacia usuario "Jhonattan"
- Helper `getEffectiveUserId()` aplicado en todos los endpoints (productos, ventas, reportes, comprobantes)
- Frontend: Flag `isAdmin` controla visibilidad del menú (oculta opción "Ventas")
- Seguridad: Limpieza automática de flags `impersonateUserId` e `isAdmin` al inicio de cada login
- Acceso de solo lectura: Admin puede visualizar todos los datos pero no registrar ventas
- Implementación sin cambios en base de datos (hardcoded mapping en backend)

### Desglose de Costos de Productos (Noviembre 2025)
- **NUEVA FUNCIONALIDAD**: Desglose detallado de costos en productos
- Campos agregados al schema: `baseCost` (costo bruto) y `capitalIncrease` (aumento de capital)
- Formulario actualizado con dos inputs separados y cálculo automático del total
- Vista de productos muestra desglose condicional con indicadores visuales (↳)
- Reportes incluyen desglose tanto en UI como en texto WhatsApp
- Retrocompatibilidad completa: productos antiguos sin desglose siguen funcionando
- Validación estricta: desglose se muestra incluso cuando baseCost es 0 (usando `!== null && !== undefined`)

### Migración a Object Storage para Imágenes de Productos (Noviembre 2025)
- **PROBLEMA RESUELTO**: Imágenes de productos desaparecían después de ~1 día
- Causa: Sistema de archivos local en Replit es efímero (se borra al reiniciar contenedor)
- Solución: Migración a **Replit Object Storage** (permanente)
- Backend ahora guarda imágenes en Object Storage como "products/timestamp-nombre.jpg"
- Frontend transforma rutas automáticamente: "products/..." → "/api/storage/products/..."
- Compatibilidad con imágenes antiguas: rutas "/uploads/..." siguen funcionando
- Las imágenes ahora son **permanentes** y nunca se borrarán

### Corrección de Zona Horaria (Octubre 2025)
- Cambiado tipo de columna `saleDate` de `timestamp` a `date`
- Implementado formateo manual de fechas sin conversión UTC
- Las fechas ahora se muestran correctamente sin desfase de un día

### Sistema de Comprobantes de Pago (Octubre 2025)
- Tabla `daily_payments` para registrar pagos por día
- Subida de dos comprobantes: comisión José Eduardo y pago de producto
- Almacenamiento en Replit Object Storage
- Checkbox para marcar día como pagado
- Indicador visual (checkmark verde) de estado de pago
- Persistencia de estado después de recargar página
- Botones "Ver" para visualizar comprobantes guardados en nueva pestaña
- Endpoint API `/api/storage/:path(*)` para servir imágenes desde object storage

### Fix de Autenticación en Producción (Octubre 2025)
- Configuración de sesión ajustada para funcionar en producción
- `resave: true` y `saveUninitialized: true` para persistencia garantizada
- Cookies configuradas con `secure: false` y `sameSite: "lax"` para compatibilidad total
- `req.session.save()` explícito en login/register para garantizar cookie antes de respuesta

### SEO y Meta Tags (Octubre 2025)
- Favicon personalizado agregado (favicon.png)
- Imagen Open Graph para compartir en redes sociales (og-image.jpg)
- Meta tags OG (Facebook) implementados con título, descripción e imagen
- Meta tags Twitter Card implementados para preview en Twitter
- URL base configurada: https://pro.ryztor.store/

### Funcionalidad de Edición de Productos (Octubre 2025)
- Hook `useUpdateProduct` agregado en `client/src/lib/api.ts`
- Botón "Editar" en tarjetas de productos ahora funcional
- Formulario reutilizado para crear y editar productos
- Al editar, formulario se pre-llena con datos del producto
- Actualización de nombre, precio, costo e imagen opcional
- Notificación toast de confirmación al guardar cambios

### Fix de Login con Espacios Extra (Octubre 2025)
- Login y registro ahora hacen `.trim()` automático en username y nombre
- Previene problemas de autenticación por espacios al inicio/final
- Usuario existente "Jhonattan " actualizado a "Jhonattan" (sin espacio)
- Asegura login consistente desde cualquier dispositivo

## Próximas Mejoras Sugeridas
1. Dashboard con gráficos y estadísticas
2. Exportación de reportes en PDF/Excel
3. Integración directa con WhatsApp Business API
4. Notificaciones automáticas por WhatsApp
5. Sistema de roles (admin, vendedor)
6. Historial de cambios en productos
7. Backup automático de datos

## Notas de Desarrollo
- Imágenes de productos se guardan localmente en `/uploads`
- Comprobantes de pago se guardan en Replit Object Storage
- Sesiones en memoria (usar store persistente en producción)
- Modo oscuro disponible con toggle en header
- Diseño responsive para móviles
- Validación con Zod en frontend y backend
- Formateo de fechas sin dependencia de zona horaria (formato YYYY-MM-DD)
- **Credenciales Admin**: Usuario "arely" con contraseña "@Omega2020" tiene acceso especial
- **Impersonación Admin**: El sistema usa `req.session.impersonateUserId` y `req.session.isAdmin` para manejo de permisos admin
- **Helper de Backend**: `getEffectiveUserId(req)` debe usarse en lugar de `req.session.userId` en todos los endpoints que acceden a datos de usuario

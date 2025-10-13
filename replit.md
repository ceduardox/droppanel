# Sistema de Gestión de Ventas

## Descripción del Proyecto
Sistema web para gestión de ventas con registro de usuarios, catálogo de productos, registro de ventas y generación de reportes con cálculo automático de utilidades divididas 50/50 entre dos socios (José Eduardo y Jhonatan).

## Características Principales
- **Autenticación**: Registro y login de usuarios con contraseñas encriptadas
- **Gestión de Productos**: Agregar, editar y eliminar productos con imágenes, precios y costos
- **Registro de Ventas**: Registrar ventas por fecha y cantidad con cálculo automático de utilidades
- **Reportes Detallados**: Visualización de ventas con desglose de costos y ganancias
- **Distribución de Utilidades**: Cálculo automático 50/50 entre José Eduardo y Jhonatan
- **WhatsApp**: Generación de reporte en texto formateado listo para compartir por WhatsApp

## Arquitectura Técnica

### Frontend
- React con TypeScript
- Wouter para enrutamiento
- TanStack Query para manejo de estado y API
- Shadcn UI + Tailwind CSS para componentes
- Soporte para modo claro/oscuro

### Backend
- Express.js con TypeScript
- PostgreSQL (Neon) para persistencia
- Express Session para autenticación
- Bcrypt para encriptación de contraseñas
- Multer para carga de imágenes

### Base de Datos
**Tablas:**
- `users`: Usuarios del sistema (id, name, username, password)
- `products`: Catálogo de productos (id, name, price, cost, imageUrl, userId)
- `sales`: Registro de ventas (id, productId, quantity, saleDate, userId)

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

### 2. Gestión de Productos
- Agregar productos con nombre, precio de venta, costo y foto opcional
- Ver lista de productos con cálculo de utilidad por unidad
- Editar o eliminar productos existentes

### 3. Registro de Ventas
- Seleccionar producto del catálogo
- Ingresar cantidad vendida y fecha
- Sistema calcula automáticamente:
  - Total de venta (precio × cantidad)
  - Costo total (costo × cantidad)
  - Utilidad total (venta - costo)
  - Distribución 50/50 entre socios

### 4. Reportes
- Ver todas las ventas registradas
- Desglose detallado por venta
- Resumen total acumulado
- Generar texto formateado para WhatsApp con:
  - Detalle de cada venta
  - Totales generales
  - Distribución de utilidad por socio

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
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Ventas
- `GET /api/sales` - Listar ventas del usuario
- `POST /api/sales` - Registrar nueva venta

### Reportes
- `GET /api/reports` - Obtener ventas con detalles de productos

## Variables de Entorno
- `DATABASE_URL` - Conexión a PostgreSQL
- `SESSION_SECRET` - Secreto para sesiones
- `PORT` - Puerto del servidor (default: 5000)

## Comandos Principales
```bash
npm run dev          # Iniciar desarrollo
npm run build        # Compilar para producción
npm run db:push      # Sincronizar esquema de BD
```

## Próximas Mejoras Sugeridas
1. Integración directa con WhatsApp Business API
2. Dashboard con gráficos y estadísticas
3. Filtros de reportes por fecha/producto
4. Exportación de reportes en PDF/Excel
5. Notificaciones automáticas por WhatsApp
6. Sistema de roles (admin, vendedor)
7. Historial de cambios en productos
8. Backup automático de datos

## Notas de Desarrollo
- Las imágenes se guardan localmente en `/uploads`
- Sesiones en memoria (usar store persistente en producción)
- Modo oscuro disponible con toggle en header
- Diseño responsive para móviles
- Validación con Zod en frontend y backend

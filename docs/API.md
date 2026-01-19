# API Reference - Shama Core Platform

**Versión:** 1.0.0
**Base URL:** `http://localhost:5000` (Desarrollo) / `https://api.shama.com` (Producción)
**Nota:** Sistema protegido con JWT. Requiere autenticación para la mayoría de endpoints.

---
---

## 1. Autenticación

### Login
- **Endpoint:** `POST /auth/login`
- **Descripción:** Obtener token JWT para acceder a la API
- **Body:**
  ```json
  {
    "email": "admin@test.com",
    "password": "any"
  }
  ```
- **Respuesta:**
  ```json
  {
    "access_token": "jwt_token_here",
    "user": {
      "id": "user-1",
      "email": "admin@test.com",
      "roles": ["ADMIN"]
    }
  }
  ```

### Uso del Token
Incluir el token en el header `Authorization: Bearer <token>` para todos los requests protegidos.

**Roles disponibles:** ADMIN, SALES, READONLY

---

## 2. Inventory Service (Port: 5001)
### 2.1 Productos

#### Listar Productos
- **Endpoint:** `GET /api/v1/products`
- **Query Params:** `?page=1&limit=50&search=hammer`
- **Respuesta:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "sku": "HAM001",
        "name": "Martillo Industrial",
        "price": 25.50,
        "stock": 100
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200
    }
  }
  ```

#### Crear Producto
- **Endpoint:** `POST /api/v1/products`
- **Roles:** ADMIN
- **Body:**
  ```json
  {
    "sku": "HAM001",
    "name": "Martillo Industrial",
    "price": 25.50,
    "initialStock": 100
  }
  ```

#### Actualizar Stock
- **Endpoint:** `PATCH /api/v1/products/{id}/stock`
- **Body:**
  ```json
  {
    "adjustment": -5,
    "reason": "Venta"
  }
  ```

---

## 3. CRM Service (Port: 5002)

### 3.1 Clientes

#### Listar Clientes
- **Endpoint:** `GET /api/v1/customers`
- **Query Params:** `?page=1&limit=50&search=empresa`

#### Crear Cliente
- **Endpoint:** `POST /api/v1/customers`
- **Body:**
  ```json
  {
    "name": "Empresa XYZ",
    "nit": "123456789",
    "address": "Calle 123",
    "email": "contacto@empresa.com"
  }
  ```

---

## 4. Sales Service (Port: 5003)

### 4.1 Cotizaciones

#### Listar Cotizaciones
- **Endpoint:** `GET /api/v1/quotations`
- **Query Params:** `?status=PENDING&page=1&limit=20`
- **Respuesta:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "customerName": "Empresa XYZ",
        "status": "PENDING",
        "totalAmount": 1250.00,
        "itemCount": 5,
        "createdAt": "2026-01-18T00:00:00Z"
      }
    ]
  }
  ```

#### Crear Cotización
- **Endpoint:** `POST /api/v1/quotations`
- **Roles:** SALES, ADMIN
- **Body:**
  ```json
  {
    "customerId": "uuid",
    "items": [
      {
        "productId": "uuid",
        "quantity": 2
      }
    ]
  }
  ```

#### Aprobar Cotización
- **Endpoint:** `POST /api/v1/quotations/{id}/approve`
- **Roles:** SALES, ADMIN

#### Generar PDF
- **Endpoint:** `GET /api/v1/quotations/{id}/pdf`
- **Respuesta:** Stream binario del PDF

---

## 5. Códigos de Error

- `400 Bad Request`: Datos inválidos
- `401 Unauthorized`: Token faltante o inválido
- `403 Forbidden`: Permisos insuficientes
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto de estado (ej. cotización ya aprobada)
- `500 Internal Server Error`: Error del servidor

---

## 6. Rate Limiting

- **Límite Global:** 100 req/min por IP
- **Headers de Respuesta:**
  - `X-RateLimit-Limit`: Límite total
  - `X-RateLimit-Remaining`: Solicitudes restantes
  - `X-RateLimit-Reset`: Timestamp de reset
# Shama Core Platform - Postman Collection

Colección completa de Postman para pruebas de integración de la plataforma Shama Core.

## 📋 Requisitos Previos

1. **Sistema Desplegado**: Asegúrate de que Shama Core Platform esté ejecutándose
2. **Postman**: Descarga e instala [Postman](https://www.postman.com/downloads/)
3. **Credenciales**: Usuario con permisos adecuados (ADMIN, SALES, o READONLY)

## 🚀 Configuración Inicial

### 1. Importar Colección

1. Abre Postman
2. Click en "Import" (esquina superior izquierda)
3. Selecciona "File"
4. Importa el archivo `Shama-Core-Platform.postman_collection.json`

### 2. Configurar Variables

En la colección, configura estas variables:

| Variable | Valor por Defecto | Descripción |
|----------|------------------|-------------|
| `base_url` | `http://localhost:5000` | URL del API Gateway |
| `jwt_token` | *(vacío)* | Token JWT obtenido del login |
| `customer_id` | *(vacío)* | ID de cliente para pruebas |
| `product_id` | *(vacío)* | ID de producto para pruebas |
| `quotation_id` | *(vacío)* | ID de cotización para pruebas |

### 3. Autenticación

**Nota**: La API requiere autenticación JWT. Actualmente, la colección incluye un endpoint simulado de login.

Para producción, necesitarás:
1. Un endpoint real de autenticación que devuelva JWT
2. Configurar el token en la variable `jwt_token`

## 📚 Estructura de la Colección

### 🔐 Authentication
- **Login (Simulado)**: Obtener token JWT

### 🏥 Health Checks
- **Gateway Health**: Verificar API Gateway
- **Inventory Service Health**: Verificar servicio de inventario
- **CRM Service Health**: Verificar servicio de CRM
- **Sales Service Health**: Verificar servicio de ventas

### 📦 Products API
- **Get All Products**: Listar productos con paginación
- **Create Product**: Crear nuevo producto
- **Update Product Stock**: Actualizar stock de producto

### 👥 Customers API
- **Get All Customers**: Listar clientes
- **Create Customer**: Crear nuevo cliente

### 📄 Quotations API
- **Get All Quotations**: Listar cotizaciones
- **Create Quotation**: Crear nueva cotización
- **Approve Quotation**: Aprobar cotización
- **Download Quotation PDF**: Descargar PDF de cotización

### ⚡ Load Testing Scenarios
- **Bulk Create Products**: Crear productos en masa
- **Bulk Create Customers**: Crear clientes en masa

### ❌ Error Scenarios
- **Invalid Product Data**: Probar validación de datos
- **Unauthorized Access**: Probar autenticación
- **Insufficient Permissions**: Probar autorización
- **Rate Limiting**: Probar límites de requests

## 🎯 Guía de Uso

### Flujo Básico de Pruebas

1. **Health Checks**: Verificar que todos los servicios estén funcionando
2. **Autenticación**: Obtener token JWT
3. **Crear Datos Base**:
   - Crear un producto
   - Crear un cliente
4. **Crear Cotización**: Usar producto y cliente creados
5. **Aprobar Cotización**: Cambiar estado a SOLD
6. **Descargar PDF**: Verificar generación de documentos

### Variables Automáticas

La colección está configurada para guardar automáticamente IDs importantes:
- `product_id`: Se actualiza al consultar productos
- `customer_id`: Se actualiza al consultar clientes
- `quotation_id`: Se actualiza al crear/listar cotizaciones

### Tests Automáticos

Cada request incluye tests automáticos que verifican:
- ✅ Códigos de estado HTTP correctos
- ✅ Estructura de respuesta esperada
- ✅ Campos requeridos presentes
- ✅ Tipos de datos correctos
- ✅ Headers de seguridad
- ✅ Tiempo de respuesta (< 500ms)

## 🔧 Configuración Avanzada

### Rate Limiting

La API incluye rate limiting global de 100 requests/minuto por IP. Los tests verifican automáticamente los headers de rate limiting.

### Roles y Permisos

| Endpoint | ADMIN | SALES | READONLY |
|----------|-------|-------|----------|
| GET /products | ✅ | ✅ | ✅ |
| POST /products | ✅ | ❌ | ❌ |
| GET /customers | ✅ | ✅ | ✅ |
| POST /customers | ✅ | ✅ | ❌ |
| GET /quotations | ✅ | ✅ | ✅ |
| POST /quotations | ✅ | ✅ | ❌ |
| POST /quotations/*/approve | ✅ | ❌ | ❌ |
| GET /quotations/*/pdf | ✅ | ✅ | ✅ |

### Headers de Respuesta

Todos los endpoints incluyen headers de seguridad:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## 🧪 Escenarios de Testing

### Testing de Carga

Para testing de carga con múltiples requests:

1. Usa los endpoints de "Load Testing Scenarios"
2. Configura variables dinámicas como `{{$randomInt}}`
3. Ejecuta múltiples veces o usa Postman Runner

### Testing de Errores

Los "Error Scenarios" están diseñados para probar:
- Validación de entrada
- Autenticación faltante/inválida
- Autorización insuficiente
- Rate limiting

### Testing de Integración Completa

Flujo recomendado:
1. Health checks de todos los servicios
2. Crear producto → Crear cliente → Crear cotización
3. Aprobar cotización → Descargar PDF
4. Verificar que el stock se actualizó correctamente

## 📊 Monitoreo durante Testing

### Métricas a Observar

- **Tiempo de respuesta**: < 500ms para operaciones normales
- **Tasa de error**: < 1% en condiciones normales
- **Uso de CPU/Memoria**: Monitorear con Grafana
- **Logs**: Verificar en Loki que no hay errores

### Dashboards

Accede a Grafana en `http://localhost:3000` para monitorear:
- Rendimiento de servicios
- Uso de recursos
- Logs centralizados
- Métricas de negocio

## 🚨 Troubleshooting

### Problemas Comunes

1. **401 Unauthorized**
   - Verificar que `jwt_token` esté configurado
   - Revisar expiración del token

2. **403 Forbidden**
   - Verificar permisos del usuario
   - Cambiar rol en el token

3. **404 Not Found**
   - Verificar variables de colección (`product_id`, `customer_id`, etc.)
   - Asegurar que los recursos existen

4. **429 Too Many Requests**
   - Esperar al reset del rate limit
   - Verificar headers `X-RateLimit-*`

5. **500 Internal Server Error**
   - Revisar logs de servicios en Docker
   - Verificar conectividad de base de datos

### Logs y Debugging

```bash
# Ver logs de servicios
docker-compose logs -f gateway
docker-compose logs -f sales-svc

# Ver estado de servicios
docker-compose ps

# Acceder a base de datos
docker-compose exec postgres psql -U shama_user -d shama_platform
```

## 📝 Notas Importantes

- **Entorno de Desarrollo**: Asegúrate de usar URLs de desarrollo
- **Datos de Prueba**: Los endpoints de bulk creation generan datos aleatorios
- **Rate Limiting**: Respeta los límites para evitar bloqueos
- **Clean Up**: Después del testing, considera limpiar datos de prueba

## 🤝 Contribución

Para agregar nuevos tests a la colección:

1. Exporta la colección actualizada
2. Incluye tests automáticos para validación
3. Documenta nuevos endpoints en este README
4. Actualiza variables de colección si es necesario

---

**Versión**: 1.0.0
**Última actualización**: Enero 2026
**Autor**: Shama Core Platform Team
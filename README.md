# 🚀 Shama Core Platform

**Plataforma Enterprise-Grade de Gestión de Ventas para Ferretería Shama**

> **Versión 2.0.0** - Production Ready | Microservicios | CQRS | Event-Driven | Observabilidad 360°

Una plataforma completa de microservicios construida con las mejores prácticas enterprise: NestJS, PostgreSQL, NATS JetStream, OpenTelemetry, Docker y observabilidad completa.

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 🏗️ Arquitectura Enterprise

### Microservicios (4 servicios principales)
| Servicio | Puerto | Tecnología | Responsabilidad |
|----------|--------|------------|----------------|
| **Gateway** | 5000 | NestJS + Fastify | API Gateway, Auth, Rate Limiting, Health Checks |
| **Inventory** | 5001 | NestJS + CQRS | Gestión de Productos, Stock |
| **CRM** | 5002 | NestJS | Gestión de Clientes |
| **Sales** | 5003 | NestJS + CQRS | Gestión de Cotizaciones, PDFs |

### Infraestructura Completa (11 servicios)
- **PostgreSQL + PgBouncer**: Base de datos con connection pooling
- **Redis**: Cache distribuido de alto rendimiento
- **MinIO (5004/5005)**: Object storage para PDFs y archivos
- **NATS JetStream**: Message broker con persistencia
- **Loki (5006)**: Agregación de logs centralizada
- **Grafana (5007)**: Dashboards y métricas en tiempo real
- **Jaeger (5008)**: Trazas distribuidas para debugging

## ✨ Características Enterprise

### 🔐 Seguridad & Autenticación
- **JWT Authentication** con roles granulares (ADMIN, SALES, READONLY)
- **Guards & Decorators** para autorización por endpoint
- **Rate Limiting** configurable por IP
- **Secrets Management** con Docker secrets
- **Input Validation** global automática

### 📊 Observabilidad 360°
- **OpenTelemetry**: Trazas distribuidas automáticas
- **Health Checks**: Monitoreo de memoria, disco y servicios
- **Logging Estructurado**: JSON logs con Loki
- **Métricas Custom**: Performance y business metrics
- **Dashboards Grafana**: Visualización en tiempo real

### ⚡ Performance & Escalabilidad
- **CQRS Pattern**: Separación óptima de lectura/escritura
- **Event-Driven**: Comunicación asíncrona entre servicios
- **Caching Avanzado**: Redis con TTL y invalidación
- **Connection Pooling**: PgBouncer para DB
- **Circuit Breakers**: Resiliencia en fallos

### 🛠️ Desarrollo & DevOps
- **Docker Ready**: Despliegue con un comando
- **Hot Reload**: Desarrollo con recarga automática
- **Migrations**: Database versioning con TypeORM
- **Testing**: Jest configurado para unit/integration/E2E
- **CI/CD**: Pipeline preparado para GitHub Actions

## 🚀 Inicio Rápido

### Prerrequisitos Mínimos
- **CPU:** 2 vCPU (4 recomendado)
- **RAM:** 4 GB (8 GB recomendado)
- **Disco:** 50 GB SSD
- **OS:** Ubuntu 22.04+ / Docker compatible

### Despliegue Automatizado
```bash
# Clonar y desplegar (3 minutos)
git clone <repository-url> shama-core
cd shama-core
./deploy.sh
```

### Verificar Despliegue
```bash
# Todos los servicios corriendo
docker compose ps

# Health check global
curl http://localhost:5000/health
```

## 🌐 Acceso a Interfaces

| Servicio | URL | Credenciales | Descripción |
|----------|-----|--------------|-------------|
| **API Gateway** | http://localhost:5000 | JWT Token | API REST principal |
| **Grafana** | http://localhost:5007 | admin/admin | Dashboards & Métricas |
| **MinIO Console** | http://localhost:5005 | minioadmin/minioadmin123 | Storage Web UI |
| **Loki** | http://localhost:5006 | - | Logs Centralizados |
| **Jaeger** | http://localhost:5008 | - | Trazas Distribuidas |

## 📋 Puertos Utilizados (5000-5099)

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Gateway | 5000 | API Gateway principal |
| Inventory | 5001 | Gestión de productos |
| CRM | 5002 | Gestión de clientes |
| Sales | 5003 | Gestión de cotizaciones |
| MinIO API | 5004 | Object storage API |
| MinIO Console | 5005 | Interfaz web MinIO |
| Loki | 5006 | Log aggregation |
| Grafana | 5007 | Dashboards y métricas |
| Jaeger | 5008 | Trazas distribuidas |

## 🔐 Autenticación

```bash
# Login para obtener token JWT
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "any"}'

# Respuesta esperada:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-1",
    "email": "admin@test.com",
    "roles": ["ADMIN"]
  }
}

# Usar token en requests
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/products
```

## 📋 Flujo de Uso Completo

### 1. Configuración Inicial
```bash
# Crear producto
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "HAM001",
    "name": "Martillo Industrial",
    "price": 25.50,
    "initialStock": 100
  }'
```

### 2. Gestión de Clientes
```bash
# Crear cliente
curl -X POST http://localhost:5000/api/v1/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ferretería Ejemplo S.A.",
    "nit": "123456789",
    "address": "Calle Principal 123",
    "email": "contacto@ejemplo.com"
  }'
```

### 3. Ciclo de Cotización Completo
```bash
# Crear cotización (precios obtenidos automáticamente de Inventory)
curl -X POST http://localhost:5000/api/v1/quotations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_UUID",
    "items": [
      {
        "productId": "PRODUCT_UUID",
        "quantity": 5
      }
    ]
  }'

# Listar cotizaciones
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/v1/quotations

# Aprobar cotización (reduce stock automáticamente vía eventos)
curl -X POST http://localhost:5000/api/v1/quotations/QUOTATION_UUID/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Generar PDF profesional con branding
curl http://localhost:5000/api/v1/quotations/QUOTATION_UUID/pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output cotizacion.pdf
```

## 📚 Documentación

- **[📋 DEPLOYMENT.md](DEPLOYMENT.md)** - Guía completa de despliegue en producción
- **[🔌 API Reference](docs/API.md)** - Endpoints y especificaciones completas
- **[🏗️ High-Level Design](docs/HLD.md)** - Arquitectura detallada
- **[🔒 Security Guide](docs/SECURITY.md)** - Políticas de seguridad
- **[🧪 Testing Strategy](docs/TESTING.md)** - Estrategia de testing
- **[🔧 Troubleshooting](docs/TROUBLESHOOTING.md)** - Resolución de problemas

## 🛠️ Desarrollo Local

### Configuración del Entorno
```bash
# Instalar dependencias
pnpm install

# Configurar secrets
mkdir -p secrets
echo "secure_password" > secrets/db_password.txt
echo "jwt_secret_key" > secrets/jwt_secret.txt

# Levantar servicios
docker compose up -d

# Verificar health
curl http://localhost:5000/health
```

### Desarrollo Individual
```bash
# Servicio específico
npx nx serve gateway
npx nx serve sales-svc

# Construir
npx nx build gateway

# Testing
pnpm test
pnpm test:e2e
```

### Debugging
```bash
# Logs en tiempo real
docker compose logs -f gateway

# Acceder a contenedor
docker compose exec gateway sh

# Ver métricas
curl http://localhost:5000/health
```

## 📊 Monitoreo & Observabilidad

### Dashboards Grafana
- **URL:** http://localhost:5007 (admin/admin)
- **Health Checks** de todos los servicios
- **Performance Metrics** de APIs
- **Business Metrics** (cotizaciones, productos)
- **System Resources** (CPU, memoria, disco)

### Logs Centralizados (Loki)
- **URL:** http://localhost:5006
- Búsqueda por servicio, nivel y tiempo
- Filtros avanzados
- Integración con Grafana

### Trazas Distribuidas (Jaeger)
- **URL:** http://localhost:5008
- Visualización de requests entre microservicios
- Debugging de latencia y errores
- Performance bottlenecks

## 🔧 Administración

### Gestión de Servicios
```bash
# Estado de servicios
docker compose ps

# Reiniciar servicio
docker compose restart gateway

# Ver logs
docker compose logs -f sales-svc

# Backup
docker compose exec postgres pg_dump -U shama_user shama_platform > backup.sql
```

### Troubleshooting Común
```bash
# Servicios no inician
docker compose logs <service-name>

# Problemas de conectividad
docker compose exec gateway ping inventory-svc

# Alto uso de recursos
docker stats

# Limpiar cache Redis
docker compose exec redis redis-cli FLUSHALL
```

## 🚀 Despliegue en Producción

### Servidor Recomendado
- **CPU:** 2-4 vCPU (Intel i5+)
- **RAM:** 4-8 GB
- **Disco:** 50-100 GB SSD
- **OS:** Ubuntu 22.04 LTS

### Deployment Automatizado
```bash
# En servidor de producción
git clone <repository-url> shama-core
cd shama-core

# Configurar secrets
echo "tu_password_seguro_db" > secrets/db_password.txt
echo "tu_jwt_secret_muy_seguro" > secrets/jwt_secret.txt

# Desplegar
./deploy.sh
```

### Post-Deployment
1. ✅ Verificar health checks
2. ✅ Configurar dominio (opcional)
3. ✅ Configurar SSL con Let's Encrypt
4. ✅ Configurar backups automáticos
5. ✅ Configurar monitoring alerts

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

### Estándares de Código
- **ESLint** configurado
- **Prettier** para formato
- **Jest** para testing
- **TypeScript** estricto
- **Conventional Commits**

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

- **📧 Email:** soporte@shama.com
- **📚 Docs:** Ver carpeta `docs/`
- **🐛 Issues:** GitHub Issues
- **💬 Discord:** [Shama Community](https://discord.gg/shama)

---

## 🎯 Roadmap

### ✅ Versión 2.0.0 (Actual)
- [x] Arquitectura de microservicios completa
- [x] CQRS pattern implementado
- [x] Autenticación JWT con roles
- [x] Observabilidad 360° (OpenTelemetry, Loki, Grafana)
- [x] Health checks avanzados
- [x] Caching con Redis
- [x] Object storage con MinIO
- [x] PDF generation profesional
- [x] Docker production-ready

### 🔄 Próximas Versiones
- [ ] Multi-tenancy support
- [ ] API Gateway avanzado (Kong)
- [ ] Service mesh (Istio)
- [ ] Auto-scaling con Kubernetes
- [ ] Mobile app companion
- [ ] Advanced analytics
- [ ] Machine learning para predicciones

---

**Ferretería Shama** - Sistema de gestión empresarial moderno, escalable y enterprise-grade. 🚀⚡

*Construido con ❤️ para la excelencia empresarial*

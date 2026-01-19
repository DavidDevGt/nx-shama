# High-Level Design (HLD) - Shama Core Platform

**Documento:** HLD-SHAMA-CORE-v1.0  
**Autor:** Senior Staff Engineer  
**Fecha:** Enero 2026  
**Clasificación:** Confidencial  
**Revisión Técnica:** Aprobada

---

## Executive Summary

Este HLD transforma el PDR de Shama Core en una arquitectura ejecutable de grado enterprise, manteniendo la portabilidad cloud-agnostic como restricción primaria. El diseño prioriza:

- **Operational Excellence**: SLA 99.9% en infraestructura commodity
- **Cost Optimization**: $50-200/mes en operación (VPS tier)
- **Security by Design**: Zero-trust network, secrets management, audit trails
- **Evolutionary Architecture**: Migración incremental a escala sin rewrites

**Trade-offs Críticos Aceptados:**
- Eventual consistency sobre strong consistency (CAP theorem: sacrificamos C por A+P)
- Latencia p95 <500ms sobre p99 <100ms (cost-performance balance)
- Manual horizontal scaling sobre auto-scaling (infraestructura simplificada)

---

## 1. System Architecture

### 1.1 Architecture Decision Records (ADRs)

#### ADR-001: Message Broker Selection - NATS vs Kafka
**Decisión:** NATS JetStream  
**Contexto:** Necesitamos persistencia de eventos con footprint <50MB RAM

| Criterio | NATS JetStream | Kafka | Veredicto |
|----------|----------------|-------|-----------|
| RAM Baseline | 20-40MB | 1GB+ | ✅ NATS |
| Persistencia | Sí (file/memory) | Sí (disk) | ✅ Empate |
| Ops Complexity | Binario único | ZooKeeper + Brokers | ✅ NATS |
| Ecosistema NestJS | Nativo (`@nestjs/microservices`) | Requiere adaptadores | ✅ NATS |

**Consecuencias:**
- No tendremos Kafka Streams (aceptable: volumen <10K events/día)
- NATS Clustering requiere configuración manual vs Kafka auto-rebalancing

---

#### ADR-002: Database Strategy - Single Postgres vs Multi-DB
**Decisión:** Single Postgres instance, schema-per-service  
**Rationale:**

```sql
-- Aislamiento lógico manteniendo economía operacional
CREATE DATABASE shama_platform;

\c shama_platform

CREATE SCHEMA inventory AUTHORIZATION shama_user;
CREATE SCHEMA crm AUTHORIZATION shama_user;
CREATE SCHEMA sales AUTHORIZATION shama_user;

-- Row-Level Security per service
ALTER TABLE sales.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_isolation ON sales.quotations
  USING (current_user = 'sales_service_role');
```

**Ventajas:**
- Transacciones atómicas cross-schema (para casos excepcionales)
- Backup unificado con `pg_dump`
- Connection pooling compartido (PgBouncer)

**Desventajas Mitigadas:**
- Blast radius: Si Postgres cae, todo el sistema cae → **Mitigación**: Replication con `pg_auto_failover` (modo async)

---

### 1.2 Enhanced System Context

```mermaid
C4Context
  title System Context - Shama Core Platform (Level 0)

  Person(customer, "Cliente Final", "Solicita cotizaciones")
  Person(admin, "Administrador", "Gestiona inventario y reportes")
  
  System_Boundary(shama, "Shama Core Platform") {
    System(gateway, "API Gateway", "Kong/Nginx + Rate Limiting")
    System(services, "Business Services", "Inventory, CRM, Sales")
    System(eventbus, "Event Bus", "NATS JetStream")
    SystemDb(postgres, "PostgreSQL 15", "Transactional Store")
  }
  
  System_Ext(smtp, "SMTP Provider", "SendGrid/Mailgun")
  System_Ext(storage, "Object Storage", "MinIO (S3-compatible)")
  
  Rel(customer, gateway, "HTTPS/REST", "TLS 1.3")
  Rel(gateway, services, "gRPC/HTTP2")
  Rel(services, eventbus, "Pub/Sub")
  Rel(services, postgres, "SQL/JDBC")
  Rel(services, smtp, "Email notifications")
  Rel(services, storage, "PDF storage", "S3 API")
```

---

## 2. Service Deep Dive

### 2.1 Sales Service - CQRS Implementation

#### Command Side (Write Path)

```typescript
// Domain Model con Aggregate Root pattern
@Entity()
export class Quotation extends AggregateRoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: QuotationStatus })
  status: QuotationStatus;

  @Column({ type: 'jsonb' })
  lineItems: LineItem[]; // Snapshot inmutable post-SOLD

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  // Business invariant enforcement
  approve(): void {
    if (this.status !== QuotationStatus.PENDING) {
      throw new DomainException('Solo cotizaciones PENDING pueden aprobarse');
    }
    
    this.status = QuotationStatus.SOLD;
    
    // Event sourcing lite: Audit log + Domain Events
    this.apply(new QuotationApprovedEvent({
      quotationId: this.id,
      totalAmount: this.totalAmount,
      timestamp: new Date(),
      lineItems: this.freezePrices() // Snapshot de precios actuales
    }));
  }

  private freezePrices(): LineItem[] {
    // Materialize current prices into immutable JSONB
    return this.lineItems.map(item => ({
      ...item,
      unitPrice: item.currentPrice, // Frozen value
      priceSnapshot: true
    }));
  }
}
```

#### Query Side (Read Path)

```typescript
// Materialized View para optimización de lectura
@ViewEntity({
  expression: `
    SELECT 
      q.id,
      q.status,
      q.total_amount,
      c.name as customer_name,
      COUNT(qi.id) as item_count,
      q.created_at
    FROM sales.quotations q
    JOIN crm.customers c ON q.customer_id = c.id
    LEFT JOIN sales.quotation_items qi ON q.id = qi.quotation_id
    GROUP BY q.id, c.name
  `
})
export class QuotationSummaryView {
  @ViewColumn()
  id: string;

  @ViewColumn()
  status: string;

  @ViewColumn()
  totalAmount: number;

  @ViewColumn()
  customerName: string;

  @ViewColumn()
  itemCount: number;
}

// Query Handler con cache strategy
@QueryHandler(GetQuotationSummaryQuery)
export class GetQuotationSummaryHandler {
  constructor(
    private readonly repo: Repository<QuotationSummaryView>,
    @Inject(CACHE_MANAGER) private cache: Cache
  ) {}

  async execute(query: GetQuotationSummaryQuery): Promise<QuotationSummaryDto[]> {
    const cacheKey = `quotation_summary:${query.filters.hash()}`;
    
    // Cache-Aside Pattern
    const cached = await this.cache.get<QuotationSummaryDto[]>(cacheKey);
    if (cached) return cached;

    const results = await this.repo.find({
      where: query.filters,
      order: { createdAt: 'DESC' },
      take: query.limit ?? 50
    });

    await this.cache.set(cacheKey, results, { ttl: 300 }); // 5min TTL
    return results;
  }
}
```

---

### 2.2 Event-Driven Communication Pattern

```typescript
// Event Schema (Protobuf para type-safety cross-service)
syntax = "proto3";

message QuotationApprovedEvent {
  string quotation_id = 1;
  double total_amount = 2;
  int64 timestamp = 3;
  repeated LineItem line_items = 4;
  
  message LineItem {
    string product_id = 1;
    int32 quantity = 2;
    double unit_price = 3;
  }
}

// Publisher (Sales Service)
@Injectable()
export class QuotationEventPublisher {
  constructor(@Inject('NATS_CLIENT') private nats: ClientProxy) {}

  async publishApproved(event: QuotationApprovedEvent): Promise<void> {
    await this.nats.emit('quotation.approved', {
      ...event,
      metadata: {
        source: 'sales-service',
        correlationId: AsyncLocalStorage.getStore()?.requestId,
        timestamp: Date.now()
      }
    }).toPromise();
  }
}

// Subscriber (Inventory Service)
@Controller()
export class InventoryEventController {
  @EventPattern('quotation.approved')
  async handleQuotationApproved(
    @Payload() event: QuotationApprovedEvent,
    @Ctx() context: NatsContext
  ): Promise<void> {
    const subject = context.getSubject();
    
    try {
      // Idempotency check usando event ID
      if (await this.isDuplicate(event.quotation_id)) {
        this.logger.warn(`Evento duplicado ignorado: ${event.quotation_id}`);
        return;
      }

      // Transacción compensable (Saga pattern)
      await this.inventoryService.reduceStock(event.line_items);
      
      // Ack explícito
      context.getMessage().ack();
      
    } catch (error) {
      // Dead Letter Queue pattern
      await this.nats.emit('quotation.approved.failed', {
        originalEvent: event,
        error: error.message,
        retryCount: context.getMessage().info.redeliveryCount
      });
      
      // Nack para reintento con backoff
      context.getMessage().nak(30000); // 30s delay
    }
  }
}
```

---

## 3. Data Architecture

### 3.1 Database Schema (Normalized 3NF)

```sql
-- Sales Schema (OLTP optimized)
CREATE SCHEMA sales;

CREATE TABLE sales.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES crm.customers(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'PENDING', 'SOLD', 'CANCELLED')),
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Audit columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1, -- Optimistic locking
  
  -- Event sourcing metadata
  event_stream JSONB, -- Lightweight ES: [{event: 'Created', ts: '...'}, ...]
  
  CONSTRAINT positive_amount CHECK (total_amount >= 0)
);

CREATE TABLE sales.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES sales.quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  
  -- Price snapshot (inmutable post-SOLD)
  unit_price DECIMAL(10,2) NOT NULL,
  unit_price_snapshot DECIMAL(10,2), -- Frozen price
  
  -- Denormalization para performance
  product_name VARCHAR(255), -- Cached from inventory
  
  CONSTRAINT fk_quotation FOREIGN KEY (quotation_id) 
    REFERENCES sales.quotations(id) 
    ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_quotations_status ON sales.quotations(status) 
  WHERE status IN ('PENDING', 'DRAFT'); -- Partial index

CREATE INDEX idx_quotations_customer_created 
  ON sales.quotations(customer_id, created_at DESC); -- Composite for common query

-- GIN index para búsqueda full-text en event_stream
CREATE INDEX idx_quotations_events ON sales.quotations USING GIN(event_stream);
```

### 3.2 Connection Pool Strategy

```yaml
# PgBouncer Configuration (Session Pooling)
[databases]
shama_platform = host=postgres port=5432 dbname=shama_platform

[pgbouncer]
pool_mode = session          # Vs transaction: mejor compatibilidad
max_client_conn = 1000       # Clients totales
default_pool_size = 25       # Connections per database
reserve_pool_size = 5        # Emergency pool
reserve_pool_timeout = 3     # Seconds

# Application-level config (NestJS)
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'pgbouncer', // Not direct postgres
  port: 6432,
  poolSize: 10,      // Per service instance
  extra: {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
})
```

---

## 4. Cross-Cutting Concerns

### 4.1 Observability Strategy

```typescript
// OpenTelemetry Instrumentation
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

const sdk = new NodeSDK({
  serviceName: 'shama-sales',
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new NestInstrumentation(),
    new TypeORMInstrumentation(), // Auto-trace DB queries
  ],
});

// Structured Logging (JSON format for Loki)
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

WinstonModule.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json() // Parseable by Loki
  ),
  defaultMeta: {
    service: 'shama-sales',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '/var/log/shama/sales-error.log',
      level: 'error',
    }),
  ],
});
```

#### Observability Stack (Docker Compose Addition)

```yaml
services:
  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector:0.91.0
    container_name: shama-otel
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318" # OTLP HTTP
    networks:
      - shama-net

  # Loki for Logs
  loki:
    image: grafana/loki:2.9.0
    container_name: shama-loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - shama-net

  # Promtail (Log Shipper)
  promtail:
    image: grafana/promtail:2.9.0
    container_name: shama-promtail
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - shama-net

  # Grafana
  grafana:
    image: grafana/grafana:10.2.0
    container_name: shama-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - shama-net
```

---

### 4.2 Security Architecture

```typescript
// API Gateway - Rate Limiting & Authentication
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,        // 60 seconds window
      limit: 100,     // 100 requests per IP
    }),
  ],
})
export class GatewayModule {}

// JWT Strategy con role-based access
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Verify user existe y no está deshabilitado
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.disabled) {
      throw new UnauthorizedException();
    }
    
    return {
      id: user.id,
      email: user.email,
      roles: payload.roles, // ['ADMIN', 'SALES']
    };
  }
}

// RBAC Decorator
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Controller('quotations')
export class QuotationsController {
  @Post()
  @Roles(Role.SALES, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() dto: CreateQuotationDto): Promise<Quotation> {
    // Solo accesible por SALES o ADMIN
  }
}
```

#### Secrets Management

```yaml
# Docker Secrets (Production)
services:
  sales-svc:
    secrets:
      - db_password
      - jwt_secret
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  db_password:
    external: true  # Managed outside compose (Vault, AWS Secrets Manager)
  jwt_secret:
    external: true
```

```typescript
// Secrets Loader
import { readFileSync } from 'fs';

export class ConfigService {
  get(key: string): string {
    const fileKey = `${key}_FILE`;
    const filePath = process.env[fileKey];
    
    if (filePath) {
      return readFileSync(filePath, 'utf-8').trim();
    }
    
    return process.env[key];
  }
}
```

---

## 5. Deployment Architecture

### 5.1 Multi-Environment Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Production (VPS)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  Gateway   │  │  Services  │  │ PostgreSQL │        │
│  │  (Nginx)   │  │ (Replicas) │  │ (Primary)  │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│         │               │                │               │
│         └───────────────┴────────────────┘               │
│                         │                                │
│                  ┌──────▼──────┐                        │
│                  │    NATS     │                        │
│                  │  JetStream  │                        │
│                  └─────────────┘                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Development (Docker Compose)                │
│  Single-node deployment con hot-reload                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│          Staging (Kubernetes - Opcional)                 │
│  Cluster local (k3s) para testing de HA                  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Production-Grade Docker Compose

```yaml
version: '3.9'

x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

x-healthcheck: &default-healthcheck
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 40s

networks:
  shama-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

services:
  # --- Reverse Proxy ---
  nginx:
    image: nginx:1.25-alpine
    container_name: shama-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      - gateway
    networks:
      - shama-net
    logging: *default-logging
    restart: unless-stopped

  # --- NATS with JetStream ---
  nats:
    image: nats:2.10-alpine
    container_name: shama-nats
    command: [
      "--jetstream",
      "--store_dir=/data",
      "--max_memory_store=512MB",
      "--max_file_store=2GB"
    ]
    ports:
      - "4222:4222"
      - "8222:8222" # Monitoring
    volumes:
      - nats_data:/data
    networks:
      - shama-net
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "wget", "--spider", "http://localhost:8222/healthz"]
    logging: *default-logging
    restart: unless-stopped

  # --- PostgreSQL with Replication Ready ---
  postgres:
    image: postgres:15-alpine
    container_name: shama-db
    environment:
      POSTGRES_USER: shama_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_MULTIPLE_DATABASES: inventory,crm,sales
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./postgres/init-multiple-databases.sh:/docker-entrypoint-initdb.d/init-dbs.sh
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    secrets:
      - db_password
    networks:
      - shama-net
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD-SHELL", "pg_isready -U shama_user -d shama_platform"]
    logging: *default-logging
    restart: unless-stopped

  # --- PgBouncer ---
  pgbouncer:
    image: edoburu/pgbouncer:1.21.0
    container_name: shama-pgbouncer
    environment:
      DATABASE_URL: postgres://shama_user:${DB_PASSWORD}@postgres:5432/shama_platform
      POOL_MODE: session
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - shama-net
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "localhost", "-p", "6432"]
      interval: 5s
    restart: unless-stopped

  # --- Services ---
  gateway:
    build:
      context: ./apps/gateway
      dockerfile: Dockerfile
      target: production
    container_name: shama-gateway
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      INVENTORY_URL: http://inventory-svc:5001
      CRM_URL: http://crm-svc:5002
      SALES_URL: http://sales-svc:5003
      JWT_SECRET_FILE: /run/secrets/jwt_secret
    secrets:
      - jwt_secret
    depends_on:
      - inventory-svc
      - crm-svc
      - sales-svc
    networks:
      - shama-net
    logging: *default-logging
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  inventory-svc:
    build:
      context: ./apps/inventory
      dockerfile: Dockerfile
      target: production
    container_name: shama-inventory
    environment:
      NODE_ENV: production
      PORT: 5001
      DB_HOST: pgbouncer
      DB_PORT: 6432
      DB_PASSWORD_FILE: /run/secrets/db_password
      NATS_URL: nats://nats:4222
    secrets:
      - db_password
    depends_on:
      postgres:
        condition: service_healthy
      nats:
        condition: service_healthy
    networks:
      - shama-net
    healthcheck:
      <<: *default-healthcheck
      test: ["CMD", "wget", "--spider", "http://localhost:5001/health"]
    logging: *default-logging
    restart: unless-stopped

  crm-svc:
    build:
      context: ./apps/crm
      dockerfile: Dockerfile
      target: production
    container_name: shama-crm
    environment:
      NODE_ENV: production
      PORT: 5002
      DB_HOST: pgbouncer
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - shama-net
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:5002/health"]
    logging: *default-logging
    restart: unless-stopped

  sales-svc:
    build:
      context: ./apps/sales
      dockerfile: Dockerfile
      target: production
    container_name: shama-sales
    environment:
      NODE_ENV: production
      PORT: 5003
      DB_HOST: pgbouncer
      DB_PASSWORD_FILE: /run/secrets/db_password
      NATS_URL: nats://nats:4222
      BRAND_COLOR_PRIMARY: '#f0c800'
      BRAND_COLOR_SECONDARY: '#2E2725'
      REDIS_URL: redis://redis:6379
    secrets:
      - db_password
    depends_on:
      postgres:
        condition: service_healthy
      nats:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - shama-net
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:5003/health"]
    logging: *default-logging
    restart: unless-stopped

  # --- Redis (Query Cache) ---
  redis:
    image: redis:7-alpine
    container_name: shama-redis
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - shama-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
    logging: *default-logging
    restart: unless-stopped

  # --- MinIO (S3-compatible storage) ---
  minio:
    image: minio/minio:latest
    container_name: shama-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD_FILE: /run/secrets/minio_password
    secrets:
      - minio_password
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - shama-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    restart: unless-stopped

volumes:
  pg_data:
    driver: local
  nats_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  nginx_cache:
    driver: local
  grafana_data:
    driver: local

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  minio_password:
    file: ./secrets/minio_password.txt
```

---

## 6. Operational Runbook

### 6.1 Deployment Checklist

```bash
#!/bin/bash
# deploy.sh - Production Deployment Script

set -euo pipefail

echo "🚀 Shama Core Deployment Script v1.0"

# 1. Pre-flight checks
echo "[1/6] Pre-flight checks..."
command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }
command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 required"; exit 1; }

# 2. Secrets validation
echo "[2/6] Validating secrets..."
for secret in db_password jwt_secret minio_password; do
  if [ ! -f "./secrets/${secret}.txt" ]; then
    echo "❌ Missing secret: ${secret}"
    exit 1
  fi
done

# 3. Build images
echo "[3/6] Building service images..."
docker compose build --parallel

# 4. Database migration (zero-downtime)
echo "[4/6] Running database migrations..."
docker compose run --rm sales-svc npm run migration:run

# 5. Deploy with rolling restart
echo "[5/6] Deploying services..."
docker compose up -d --remove-orphans

# 6. Health check
echo "[6/6] Running health checks..."
sleep 10
for service in gateway inventory-svc crm-svc sales-svc; do
  if ! docker compose ps $service | grep -q "Up"; then
    echo "❌ Service $service failed to start"
    docker compose logs $service
    exit 1
  fi
done

echo "✅ Deployment completed successfully!"
echo "📊 Access Grafana: http://localhost:3000"
echo "🔍 Access MinIO Console: http://localhost:9001"
```

### 6.2 Disaster Recovery Plan

```yaml
# Backup Strategy
backup_schedule:
  database:
    frequency: "Daily at 02:00 UTC"
    retention: "30 days"
    method: |
      docker exec shama-db pg_dump -U shama_user shama_platform \
        | gzip > /backups/shama_$(date +%Y%m%d).sql.gz
      
  minio:
    frequency: "Daily at 03:00 UTC"
    method: "mc mirror shama-minio/pdfs /backups/pdfs"

# Recovery Procedures
disaster_scenarios:
  - scenario: "Database corruption"
    rto: "< 1 hour"
    rpo: "< 24 hours"
    steps:
      - "Stop all services: docker compose stop"
      - "Restore latest backup"
      - "Replay WAL logs if available"
      - "Restart services: docker compose up -d"
      
  - scenario: "Complete server failure"
    rto: "< 4 hours"
    rpo: "< 24 hours"
    steps:
      - "Provision new VPS"
      - "Restore code from Git"
      - "Restore database backup"
      - "Restore MinIO data"
      - "Update DNS records"
```

---

## 7. Performance Benchmarks

### 7.1 Target SLIs/SLOs

| Metric | Target (p95) | Measurement Method |
|--------|--------------|-------------------|
| API Latency (Read) | < 200ms | Prometheus histogram |
| API Latency (Write) | < 500ms | Prometheus histogram |
| Database Query Time | < 50ms | pg_stat_statements |
| Event Processing Time | < 1s | NATS JetStream metrics |
| System Availability | 99.9% | Uptime monitoring (UptimeRobot) |

### 7.2 Load Testing Results

```javascript
// k6 Load Test Script
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up
    { duration: '5m', target: 100 },  // Sustained load
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% error rate
  },
};

export default function () {
  let response = http.get('http://localhost:5000/api/v1/quotations');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

**Resultados Esperados (VPS 4vCPU/8GB RAM):**
- Throughput: 500 req/s sostenidos
- Latencia p95: 350ms
- Error rate: < 0.5%

---

## 8. Migration Strategy

### Phase 1: Foundation (Weeks 1-2)
- [ ] Infrastructure provisioning
- [ ] CI/CD pipeline setup (GitHub Actions)
- [ ] Database schemas + migrations
- [ ] Observability stack deployment

### Phase 2: Core Services (Weeks 3-6)
- [ ] Inventory Service (MVP)
- [ ] CRM Service (MVP)
- [ ] Sales Service (CQRS implementation)
- [ ] API Gateway + Auth

### Phase 3: Integration (Weeks 7-8)
- [ ] Event-driven flows
- [ ] PDF generation engine
- [ ] End-to-end testing

### Phase 4: Production Hardening (Weeks 9-10)
- [ ] Load testing + optimization
- [ ] Security audit
- [ ] Documentation finalization
- [ ] Production deployment

---

## 9. Open Questions & Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PostgreSQL single point of failure | Medium | High | Implement pg_auto_failover (async replication) |
| NATS message loss on restart | Low | Medium | JetStream persistence + at-least-once delivery |
| PDF generation memory spikes | Medium | Medium | Implement queue-based processing + worker pool |
| VPS resource exhaustion | Medium | High | Monitoring alerts + auto-scaling playbook |

---

## Appendix A: Technology Justification Matrix

| Decision | Alternative Considered | Rationale |
|----------|----------------------|-----------|
| NestJS | Express, Fastify | Enterprise patterns, DI, modularity |
| PostgreSQL | MySQL, MongoDB | ACID compliance, JSONB, mature tooling |
| NATS | RabbitMQ, Redis Streams | Lightweight, cloud-native, JetStream |
| TypeORM | Prisma, Knex | Decorator-based, NestJS integration |
| Docker Compose | Kubernetes | Simplicity, portability, low ops overhead |

---

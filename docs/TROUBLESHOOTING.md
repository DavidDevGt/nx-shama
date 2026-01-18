# Guía de Resolución de Problemas - Shama Core Platform

**Versión:** 1.0.0
**Última Actualización:** Enero 2026

---

## 1. Herramientas de Diagnóstico

### 1.1 Comandos Básicos
```bash
# Estado de servicios
docker-compose ps

# Logs en tiempo real
docker-compose logs -f <service-name>

# Uso de recursos
docker stats

# Conectividad de red
docker-compose exec <service> ping <target>

# Health checks
curl -f http://localhost:5000/health
```

### 1.2 Acceso a Interfaces
- **Grafana:** http://localhost:3000 (admin/admin)
- **MinIO Console:** http://localhost:9001
- **NATS Monitoring:** http://localhost:8222
- **pgAdmin:** Conectar a localhost:5432

---

## 2. Problemas Comunes de Inicio

### 2.1 Servicio No Inicia
**Síntomas:** `docker-compose ps` muestra estado "Exit" o "Restarting"

**Diagnóstico:**
```bash
# Ver logs detallados
docker-compose logs <service-name>

# Verificar dependencias
docker-compose ps
```

**Soluciones:**
- **Puerto ocupado:** `lsof -i :5001` para verificar
- **Dependencia faltante:** Asegurar que Postgres/NATS estén healthy
- **Configuración inválida:** Verificar variables de entorno

### 2.2 Database Connection Failed
**Error:** `Connection refused` o `pg_isready failed`

**Diagnóstico:**
```bash
# Verificar Postgres
docker-compose exec postgres pg_isready -U shama_user -d shama_platform

# Ver logs de PgBouncer
docker-compose logs pgbouncer
```

**Soluciones:**
```bash
# Reiniciar PgBouncer
docker-compose restart pgbouncer

# Resetear conexiones
docker-compose exec postgres psql -U shama_user -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"
```

### 2.3 NATS Connection Issues
**Error:** `NATS connection timeout`

**Diagnóstico:**
```bash
# Verificar NATS
docker-compose exec nats nats-server --version

# Test conexión
docker-compose exec sales-svc nats pub test "hello"
```

**Soluciones:**
- Reiniciar NATS: `docker-compose restart nats`
- Verificar JetStream: `docker-compose exec nats nats stream ls`

---

## 3. Problemas de Performance

### 3.1 Alta Latencia en APIs
**Síntomas:** Respuestas >500ms

**Diagnóstico:**
```bash
# Ver métricas en Grafana
# Query: histogram_quantile(0.95, rate(http_request_duration_seconds[5m]))

# Database slow queries
docker-compose exec postgres psql -U shama_user -d shama_platform -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

**Soluciones:**
- **Agregar índices:**
```sql
CREATE INDEX CONCURRENTLY idx_quotations_status_created
ON sales.quotations(status, created_at DESC)
WHERE status IN ('PENDING', 'DRAFT');
```

- **Cache issues:** Limpiar Redis `docker-compose exec redis redis-cli FLUSHALL`
- **Connection pool:** Ajustar PgBouncer config

### 3.2 Alto Uso de Memoria
**Síntomas:** Contenedores reiniciando por OOM

**Diagnóstico:**
```bash
# Ver uso de memoria
docker stats

# Ver procesos dentro del contenedor
docker-compose exec sales-svc ps aux
```

**Soluciones:**
- **Ajustar límites:**
```yaml
services:
  sales-svc:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

- **PDF generation:** Implementar worker pool o queue
- **Memory leaks:** Verificar con heap snapshots

### 3.3 Alto Uso de CPU
**Síntomas:** CPU >80% sostenido

**Diagnóstico:**
```bash
# Profiling con clinic
docker-compose exec sales-svc npx clinic doctor -- node dist/main.js

# Ver threads
docker-compose exec sales-svc ps -T
```

**Soluciones:**
- **Optimización de queries:** Usar EXPLAIN ANALYZE
- **Cache agresivo:** Aumentar TTL en Redis
- **Horizontal scaling:** Agregar réplicas

---

## 4. Problemas de Datos

### 4.1 Datos Corruptos
**Síntomas:** Errores de validación, datos inconsistentes

**Diagnóstico:**
```sql
-- Verificar constraints
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'sales.quotations'::regclass;

-- Buscar datos inválidos
SELECT * FROM sales.quotations
WHERE total_amount < 0 OR status NOT IN ('DRAFT', 'PENDING', 'SOLD', 'CANCELLED');
```

**Soluciones:**
- **Data cleanup script:**
```sql
-- Corregir datos inválidos
UPDATE sales.quotations
SET status = 'CANCELLED'
WHERE status NOT IN ('DRAFT', 'PENDING', 'SOLD', 'CANCELLED');
```

### 4.2 Event Processing Fails
**Síntomas:** Eventos no procesados, stock desactualizado

**Diagnóstico:**
```bash
# Ver streams de NATS
docker-compose exec nats nats stream info quotation-events

# Ver dead letter queue
docker-compose logs inventory-svc | grep "dead-letter"
```

**Soluciones:**
- **Reprocesar eventos:**
```bash
# Reset consumer
docker-compose exec nats nats consumer reset quotation-events inventory-consumer
```

- **Manual replay:** Publicar eventos faltantes desde DB logs

### 4.3 PDF Generation Errors
**Síntomas:** PDFs corruptos o timeouts

**Diagnóstico:**
```bash
# Ver logs de generación
docker-compose logs sales-svc | grep "pdfmake"

# Test manual
docker-compose exec sales-svc node -e "
const pdfmake = require('pdfmake');
console.log('PDFMake version:', pdfmake.version);
"
```

**Soluciones:**
- **Memory limits:** Aumentar límite del contenedor
- **Async processing:** Mover a background job
- **Template validation:** Verificar datos de entrada

---

## 5. Problemas de Red

### 5.1 Conectividad Inter-Servicios
**Síntomas:** `ECONNREFUSED` entre servicios

**Diagnóstico:**
```bash
# Test conectividad
docker-compose exec gateway ping inventory-svc

# Ver redes Docker
docker network ls
docker network inspect shama-net
```

**Soluciones:**
- **Restart network:** `docker-compose down && docker-compose up -d`
- **DNS issues:** Verificar `/etc/hosts` en contenedores

### 5.2 Rate Limiting Issues
**Síntomas:** 429 Too Many Requests inesperados

**Diagnóstico:**
```bash
# Ver métricas de rate limiting
curl -H "X-Forwarded-For: 192.168.1.1" http://localhost:5000/api/v1/quotations
# Repetir para ver límites
```

**Soluciones:**
- **Ajustar límites:** Modificar `ThrottlerModule` config
- **Whitelist IPs:** Para servicios internos

---

## 6. Problemas de Seguridad

### 6.1 Autenticación Fails
**Síntomas:** 401 Unauthorized

**Diagnóstico:**
```bash
# Verificar JWT secret
docker-compose exec gateway env | grep JWT

# Test token decoding
echo "token" | jwt decode -
```

**Soluciones:**
- **Rotar secrets:** Usar script de rotación
- **Token expiry:** Verificar `iat` y `exp` claims

### 6.2 RBAC Issues
**Síntomas:** 403 Forbidden

**Diagnóstico:**
```typescript
// Debug en código
console.log('User roles:', user.roles);
console.log('Required roles:', requiredRoles);
```

**Soluciones:**
- **Actualizar roles:** Modificar user roles en DB
- **Cache invalidation:** Limpiar cache de sesiones

---

## 7. Disaster Recovery

### 7.1 Database Corruption
**Pasos:**
1. **Stop services:** `docker-compose stop`
2. **Restore backup:**
```bash
docker-compose exec postgres pg_restore -U shama_user -d shama_platform /backups/latest.sql.gz
```
3. **Verify integrity:**
```sql
SELECT count(*) FROM sales.quotations;
```
4. **Restart:** `docker-compose up -d`

### 7.2 Complete Failure
**Pasos:**
1. **Provision new VPS**
2. **Deploy from Git:** `git clone && docker-compose up -d`
3. **Restore data:** Desde backup remoto
4. **Update DNS**

### 7.3 Data Loss Prevention
- **Point-in-time recovery:** Usar WAL archiving
- **Multi-region backups:** Replicar a cloud storage
- **Test restores:** Mensualmente

---

## 8. Debugging Avanzado

### 8.1 Profiling de Aplicación
```bash
# CPU profiling
docker-compose exec sales-svc npx clinic flame -- node dist/main.js

# Memory profiling
docker-compose exec sales-svc npx clinic heapprofiler -- node dist/main.js
```

### 8.2 Database Debugging
```sql
-- Query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sales.quotations
WHERE customer_id = 'uuid'
ORDER BY created_at DESC;

-- Lock monitoring
SELECT
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  blocked_activity.usename AS blocked_user,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### 8.3 Network Debugging
```bash
# Packet capture
docker-compose exec gateway tcpdump -i eth0 -w capture.pcap

# Connection tracing
docker-compose exec sales-svc strace -f -e network node dist/main.js
```

---

## 9. Checklist de Troubleshooting

- [ ] Logs revisados
- [ ] Métricas verificadas
- [ ] Health checks ejecutados
- [ ] Conectividad probada
- [ ] Recursos monitoreados
- [ ] Backups disponibles
- [ ] Runbook seguido
- [ ] Escalación si necesario

---

## 10. Contactos de Soporte

- **DevOps Team:** devops@shama.com
- **Development Team:** dev@shama.com
- **Infrastructure Provider:** support@digitalocean.com
- **Emergency:** +502 1234-5678
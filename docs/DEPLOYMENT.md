# Guía de Despliegue - Shama Core Platform

**Versión:** 1.0.0
**Última Actualización:** Enero 2026

---

## 1. Prerrequisitos

### 1.1 Hardware Mínimo
- **VPS Recomendado:** 4 vCPU, 8GB RAM, 100GB SSD
- **Sistemas Operativos:** Linux (Ubuntu 22.04+, CentOS 8+), macOS (desarrollo), Windows (desarrollo)
- **Arquitectura:** x86_64 o ARM64 (Raspberry Pi compatible)

### 1.2 Software Requerido
- Docker Engine 24.0+
- Docker Compose 2.0+
- Git
- Node.js 18+ (para desarrollo local)
- pnpm (recomendado para monorepo)

### 1.3 Puertos Requeridos
- 80/443: Nginx (HTTP/HTTPS)
- 4222: NATS (interno)
- 5000-5007: Servicios y herramientas
- 5432: PostgreSQL (interno)
- 6432: PgBouncer (interno)
- 6379: Redis (interno)

---

## 2. Configuración Inicial

### 2.1 Clonar Repositorio
```bash
git clone https://github.com/DavidDevGt/nx-shama shama-core
cd shama-core
```

### 2.2 Configurar Secrets
```bash
mkdir secrets
echo "your_secure_db_password" > secrets/db_password.txt
echo "your_jwt_secret_key" > secrets/jwt_secret.txt
echo "your_minio_password" > secrets/minio_password.txt
chmod 600 secrets/*.txt
```

### 2.3 Variables de Entorno
Crear `.env` para desarrollo:
```bash
NODE_ENV=development
DB_PASSWORD=secure_password
JWT_SECRET=your_jwt_secret
```

---

## 3. Despliegue en Desarrollo

### 3.1 Docker Compose Simple (PDR)
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3.2 Verificar Servicios
```bash
docker compose ps
curl http://localhost:5000/health
```

### 3.3 Logs
```bash
docker compose logs -f gateway
```

---

## 4. Despliegue en Producción

### 4.1 Preparar Servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4.2 Configurar Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 4.3 Desplegar con Script
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4.4 Verificar Despliegue
```bash
# Health checks
curl -f http://localhost:5000/health
curl -f http://localhost:5001/health
curl -f http://localhost:5002/health
curl -f http://localhost:5003/health

# Acceder a interfaces
# Grafana: http://your-server:5007 (admin/admin)
# MinIO Console: http://your-server:5005
```

---

## 5. Configuraciones Avanzadas

### 5.1 SSL/TLS con Let's Encrypt
```bash
# Instalar certbot
sudo apt install certbot -y

# Generar certificado
sudo certbot certonly --standalone -d your-domain.com

# Configurar Nginx
# Editar nginx/nginx.conf para usar SSL
```

### 5.2 Backup Automático
```bash
# Instalar cron
sudo apt install cron -y

# Agregar al crontab
crontab -e
# 0 2 * * * /path/to/backup.sh
```

### 5.3 Monitoreo Externo
- Configurar UptimeRobot para `https://your-domain.com/health`
- Alertas en Grafana para métricas críticas

---

## 6. Escalado y HA

### 6.1 Horizontal Scaling
```yaml
# docker-compose.scale.yml
services:
  sales-svc:
    deploy:
      replicas: 3
    # Load balancer configuration
```

### 6.2 Database Replication
```yaml
# Agregar réplicas de Postgres
services:
  postgres-replica:
    image: postgres:15-alpine
    # Configuración de streaming replication
```

### 6.3 NATS Clustering
```yaml
# Para múltiples nodos
nats:
  command: >
    --cluster_name shama-cluster
    --routes nats://nats-1:6222,nats://nats-2:6222
```

---

## 7. Troubleshooting Común

### 7.1 Servicio No Inicia
```bash
# Ver logs
docker compose logs <service-name>

# Verificar dependencias
docker compose ps
```

### 7.2 Problemas de Conexión DB
```bash
# Verificar PgBouncer
docker compose exec pgbouncer pg_isready -h localhost -p 6432

# Resetear conexión
docker compose restart pgbouncer
```

### 7.3 Alto Uso de Memoria
```bash
# Monitorear contenedores
docker stats

# Ajustar límites en docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
```

---

## 8. Rollback

### 8.1 Versión Anterior
```bash
# Tag específico
git checkout v1.0.0
docker compose build --no-cache
docker compose up -d
```

### 8.2 Database Rollback
```bash
# Restaurar backup
docker compose exec postgres pg_restore -U shama_user -d shama_platform /backups/backup.sql.gz
```

---

## 9. Checklist de Despliegue

- [ ] Prerrequisitos instalados
- [ ] Secrets configurados
- [ ] Firewall configurado
- [ ] SSL habilitado
- [ ] Backups automáticos
- [ ] Monitoreo configurado
- [ ] Health checks pasan
- [ ] Logs accesibles
- [ ] Documentación actualizada
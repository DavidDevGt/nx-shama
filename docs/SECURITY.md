# Guías de Seguridad - Shama Core Platform

**Versión:** 1.0.0
**Clasificación:** Confidencial

---

## 1. Principios de Seguridad

### 1.1 Zero Trust Architecture
- **Asunción:** Ninguna entidad (usuario, servicio) es confiable por defecto
- **Verificación:** Autenticación y autorización en cada request
- **Segmentación:** Redes privadas, RBAC estricto

### 1.2 Defense in Depth
- **Múltiples Capas:** Network, Application, Data
- **Fail-Safe Defaults:** Denegar por defecto, permitir explícitamente
- **Least Privilege:** Mínimos permisos necesarios

---

## 2. Autenticación y Autorización

### 2.1 JWT Implementation
```typescript
// Estrategia segura
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
      algorithms: ['HS256'],
      ignoreExpiration: false,
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Verificar usuario activo
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Verificar roles válidos
    if (!payload.roles?.length) {
      throw new UnauthorizedException('Roles requeridos');
    }

    return {
      id: user.id,
      email: user.email,
      roles: payload.roles,
    };
  }
}
```

### 2.2 Role-Based Access Control (RBAC)
```typescript
// Definición de roles
export enum Role {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  READONLY = 'READONLY'
}

// Permisos por endpoint
export const PERMISSIONS = {
  'POST /api/v1/products': [Role.ADMIN],
  'GET /api/v1/quotations': [Role.SALES, Role.ADMIN, Role.READONLY],
  'POST /api/v1/quotations': [Role.SALES, Role.ADMIN],
  'POST /api/v1/quotations/*/approve': [Role.ADMIN],
};
```

### 2.3 Password Policy
- **Longitud Mínima:** 12 caracteres
- **Complejidad:** Mayúsculas, minúsculas, números, símbolos
- **Historia:** No reutilizar últimas 5 contraseñas
- **Expiración:** 90 días
- **Bloqueo:** 5 intentos fallidos = bloqueo temporal

---

## 3. Gestión de Secrets

### 3.1 Docker Secrets
```yaml
# Producción
services:
  sales-svc:
    secrets:
      - db_password
      - jwt_secret
      - encryption_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      ENCRYPTION_KEY_FILE: /run/secrets/encryption_key

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
  encryption_key:
    external: true
```

### 3.2 ConfigService Seguro
```typescript
export class ConfigService {
  get(key: string): string {
    // Prioridad: archivo > env > default
    const fileKey = `${key}_FILE`;
    const filePath = process.env[fileKey];

    if (filePath) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Secret file not found: ${filePath}`);
      }
      return fs.readFileSync(filePath, 'utf-8').trim();
    }

    const envValue = process.env[key];
    if (!envValue) {
      throw new Error(`Configuration missing: ${key}`);
    }

    return envValue;
  }
}
```

### 3.3 Rotación de Secrets
```bash
# Script de rotación
#!/bin/bash
# rotate-secrets.sh

# Generar nuevos secrets
NEW_DB_PASS=$(openssl rand -hex 32)
NEW_JWT_SECRET=$(openssl rand -hex 64)

# Actualizar archivos
echo "$NEW_DB_PASS" > secrets/db_password.txt
echo "$NEW_JWT_SECRET" > secrets/jwt_secret.txt

# Reiniciar servicios
docker-compose restart postgres sales-svc gateway

# Limpiar logs antiguos
docker-compose logs --tail=0 > /dev/null
```

---

## 4. Seguridad de Red

### 4.1 Network Segmentation
```yaml
# Docker networks
networks:
  public:
    driver: bridge
  private:
    driver: bridge
    internal: true  # No acceso externo

services:
  nginx:
    networks:
      - public
  gateway:
    networks:
      - public
      - private
  sales-svc:
    networks:
      - private
```

### 4.2 Firewall Rules
```bash
# UFW rules para VPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 4.3 Rate Limiting
```typescript
// NestJS Throttler
ThrottlerModule.forRoot({
  ttl: 60,      // 1 minuto
  limit: 100,   // 100 requests por IP
  ignoreUserAgents: [/health-check/],
}),
```

---

## 5. Seguridad de Datos

### 5.1 Encriptación en Tránsito
- **TLS 1.3:** Obligatorio para todas las conexiones externas
- **mTLS:** Para comunicación inter-servicios (futuro)

### 5.2 Encriptación en Reposo
```sql
-- Encriptación de datos sensibles
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla con datos encriptados
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  encrypted_nit TEXT,  -- pgp_sym_encrypt(nit, encryption_key)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Data Masking
```typescript
// Masking para logs
export class DataMasker {
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }

  static maskCreditCard(number: string): string {
    return `****-****-****-${number.slice(-4)}`;
  }
}
```

---

## 6. Seguridad de Aplicación

### 6.1 Input Validation
```typescript
// DTO con validación estricta
export class CreateQuotationDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  items: QuotationItemDto[];
}

export class QuotationItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;
}
```

### 6.2 SQL Injection Prevention
```typescript
// Usar TypeORM QueryBuilder
const query = this.repo
  .createQueryBuilder('q')
  .where('q.customer_id = :customerId', { customerId })
  .andWhere('q.status IN (:...statuses)', { statuses: ['PENDING', 'SOLD'] });

// NO hacer string concatenation
// ❌ const sql = `SELECT * FROM quotations WHERE id = '${id}'`;
// ✅ Usar parámetros preparados
```

### 6.3 XSS Protection
```typescript
// Sanitización de input
import * as DOMPurify from 'dompurify';

export class Sanitizer {
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
      ALLOWED_ATTR: []
    });
  }
}
```

---

## 7. Auditoría y Monitoreo

### 7.1 Audit Logging
```typescript
@Injectable()
export class AuditService {
  constructor(private logger: Logger) {}

  logAction(action: AuditAction, userId: string, resource: string, details?: any) {
    this.logger.log({
      level: 'info',
      message: 'AUDIT',
      action,
      userId,
      resource,
      details,
      timestamp: new Date().toISOString(),
      ip: this.getClientIp(),
    });
  }
}
```

### 7.2 Security Monitoring
```yaml
# Promtail config para logs de seguridad
scrape_configs:
  - job_name: security
    static_configs:
      - targets:
          - localhost
        labels:
          job: security
          __path__: /var/log/shama/security.log
```

### 7.3 Alertas de Seguridad
- **Failed Logins:** >5 intentos por hora
- **Suspicious IPs:** Basado en geolocalización
- **Data Exfiltration:** Monitoreo de queries grandes
- **Privilege Escalation:** Cambios en roles

---

## 8. Incident Response

### 8.1 Plan de Respuesta
1. **Detección:** Alertas automáticas
2. **Contención:** Aislar sistemas afectados
3. **Investigación:** Análisis de logs y forense
4. **Recuperación:** Restaurar desde backups
5. **Lecciones:** Actualizar medidas preventivas

### 8.2 Contactos de Emergencia
- **Security Team:** security@shama.com
- **DevOps:** devops@shama.com
- **Legal:** legal@shama.com

---

## 9. Cumplimiento

### 9.1 Regulaciones
- **GDPR:** Protección de datos personales
- **SOX:** Controles financieros
- **PCI DSS:** Si se maneja pagos (futuro)

### 9.2 Auditorías
- **Frecuencia:** Anual
- **Alcance:** Code review, penetration testing, compliance check
- **Herramientas:** OWASP ZAP, SonarQube, Nessus

---

## 10. Checklist de Seguridad

### Desarrollo
- [ ] Code reviews obligatorios
- [ ] SAST/DAST en CI/CD
- [ ] Dependency scanning
- [ ] Secrets no hardcodeados

### Despliegue
- [ ] Secrets management configurado
- [ ] Firewall activo
- [ ] TLS habilitado
- [ ] Rate limiting activo

### Operación
- [ ] Monitoreo 24/7
- [ ] Backups encriptados
- [ ] Logs centralizados
- [ ] Incident response plan actualizado
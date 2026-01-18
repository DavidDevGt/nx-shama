# Estrategia de Testing - Shama Core Platform

**Versión:** 1.0.0
**Framework:** Jest + Supertest + k6

---

## 1. Pirámide de Testing

```
     E2E Tests (k6)
    /        \
   /          \
Integration   Component
  Tests       Tests
     \        /
      \      /
    Unit Tests
     (Jest)
```

---

## 2. Unit Tests

### 2.1 Cobertura Objetivo
- **Mínimo:** 80% cobertura de líneas
- **Crítico:** 90% en lógica de negocio (CQRS, domain models)

### 2.2 Ejemplos

#### Domain Model Test
```typescript
// sales-svc/src/domain/quotation.spec.ts
describe('Quotation', () => {
  it('should approve pending quotation', () => {
    const quotation = new Quotation({
      id: 'uuid',
      status: QuotationStatus.PENDING,
      totalAmount: 100
    });

    quotation.approve();

    expect(quotation.status).toBe(QuotationStatus.SOLD);
    expect(quotation.lineItems[0].priceSnapshot).toBeDefined();
  });

  it('should throw on invalid approval', () => {
    const quotation = new Quotation({
      status: QuotationStatus.DRAFT
    });

    expect(() => quotation.approve()).toThrow(DomainException);
  });
});
```

#### Service Test
```typescript
// sales-svc/src/application/quotation.service.spec.ts
describe('QuotationService', () => {
  let service: QuotationService;
  let mockRepo: MockType<Repository<Quotation>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        QuotationService,
        {
          provide: getRepositoryToken(Quotation),
          useFactory: jest.fn(() => ({
            save: jest.fn(),
            findOne: jest.fn()
          }))
        }
      ]
    }).compile();

    service = module.get<QuotationService>(QuotationService);
    mockRepo = module.get(getRepositoryToken(Quotation));
  });

  it('should create quotation', async () => {
    const dto = { customerId: 'uuid', items: [] };
    mockRepo.save.mockReturnValue({ id: 'uuid', ...dto });

    const result = await service.create(dto);

    expect(result.id).toBeDefined();
  });
});
```

### 2.3 Ejecutar Tests
```bash
# Todos los tests
pnpm test

# Con cobertura
pnpm test:cov

# Tests específicos
pnpm test -- quotation.spec.ts
```

---

## 3. Integration Tests

### 3.1 Database Integration
```typescript
// sales-svc/src/infrastructure/quotation.repository.spec.ts
describe('QuotationRepository', () => {
  let repo: QuotationRepository;
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = await createTestDataSource();
    repo = new QuotationRepository(dataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('should save and retrieve quotation', async () => {
    const quotation = new Quotation({ ... });

    await repo.save(quotation);
    const retrieved = await repo.findById(quotation.id);

    expect(retrieved.status).toBe(quotation.status);
  });
});
```

### 3.2 Event Bus Integration
```typescript
// Test NATS communication
describe('EventPublisher', () => {
  let publisher: QuotationEventPublisher;
  let mockClient: MockType<ClientProxy>;

  beforeEach(() => {
    mockClient = { emit: jest.fn() };
    publisher = new QuotationEventPublisher(mockClient as any);
  });

  it('should publish approved event', async () => {
    const event = { quotationId: 'uuid' };

    await publisher.publishApproved(event);

    expect(mockClient.emit).toHaveBeenCalledWith(
      'quotation.approved',
      expect.objectContaining({
        metadata: expect.any(Object)
      })
    );
  });
});
```

---

## 4. Component Tests

### 4.1 Controller Tests
```typescript
// sales-svc/src/presentation/quotations.controller.spec.ts
describe('QuotationsController', () => {
  let controller: QuotationsController;
  let mockService: MockType<QuotationService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [
        {
          provide: QuotationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<QuotationsController>(QuotationsController);
    mockService = module.get(QuotationService);
  });

  it('should create quotation', async () => {
    const dto = { customerId: 'uuid' };
    mockService.create.mockResolvedValue({ id: 'uuid' });

    const result = await controller.create(dto);

    expect(result.id).toBe('uuid');
  });
});
```

---

## 5. End-to-End Tests

### 5.1 API E2E con Supertest
```typescript
// gateway/src/app.spec.ts
describe('Gateway (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/v1/quotations (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/quotations')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeInstanceOf(Array);
      });
  });
});
```

### 5.2 Load Testing con k6
```javascript
// tests/load/k6-script.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const response = http.get('http://localhost:5000/api/v1/quotations');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

#### Ejecutar Load Test
```bash
# Instalar k6
# brew install k6 (macOS)
# sudo apt install k6 (Linux)

k6 run tests/load/k6-script.js
```

---

## 6. Testing de Infraestructura

### 6.1 Docker Compose Tests
```bash
# Test de health checks
docker-compose up -d
sleep 30
docker-compose ps | grep -q "Up" || exit 1

# Test de conectividad
docker-compose exec gateway curl -f http://inventory-svc:5001/health
```

### 6.2 Database Migrations Test
```bash
# Test migrations
docker-compose run --rm sales-svc npm run migration:run

# Verify schema
docker-compose exec postgres psql -U shama_user -d shama_platform -c "\dt sales.*"
```

---

## 7. CI/CD Pipeline

### 7.1 GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:cov
      - run: pnpm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 8. Métricas de Calidad

### 8.1 Code Coverage
- **Unit Tests:** >80%
- **Integration Tests:** >70%
- **E2E Tests:** >50%

### 8.2 Performance Benchmarks
- **Unit Tests:** <100ms por test
- **E2E Tests:** <30s suite completa
- **Load Test:** 95p <500ms, error rate <5%

### 8.3 Mutation Testing (Opcional)
```bash
# Usar StrykerJS para mutation testing
npx stryker run
```

---

## 9. Best Practices

- **Test First:** TDD para lógica crítica
- **Isolation:** Mocks para dependencias externas
- **Data Management:** Test databases separadas
- **Flakiness:** Retry logic para tests inestables
- **Documentation:** Tests como documentación viva
- **CI Integration:** Tests en cada commit
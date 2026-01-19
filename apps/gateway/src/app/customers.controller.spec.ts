import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { HttpService } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('CustomersController', () => {
  let controller: CustomersController;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [CustomersController],
      providers: [
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    httpService = module.get<HttpService>(HttpService);

    // Set environment variable for CRM_URL
    process.env.CRM_URL = 'http://crm-svc:5002';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.CRM_URL;
  });

  describe('findAll', () => {
    it('should return customers from CRM service', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          name: 'Empresa XYZ',
          nit: '123456789',
          address: 'Calle Principal 123',
          email: 'contacto@empresa.com',
        },
        {
          id: 'customer-2',
          name: 'Compañía ABC',
          nit: '987654321',
          address: 'Avenida Central 456',
          email: 'info@compania.com',
        },
      ];

      const mockResponse: AxiosResponse = {
        data: mockCustomers,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.findAll();

      expect(mockHttpService.get).toHaveBeenCalledWith('http://crm-svc:5002/api/v1/customers');
      expect(result).toEqual(mockCustomers);
    });

    it('should handle empty customers list', async () => {
      const mockResponse: AxiosResponse = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockHttpService.get.mockReturnValue(throwError(() => new Error('CRM service unavailable')));

      await expect(controller.findAll()).rejects.toThrow('CRM service unavailable');
    });

    it('should return customers with correct structure', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          name: 'Ferretería Shama',
          nit: '1234567890123',
          address: 'Zona 1, Guatemala',
          email: 'ventas@shama.com',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockResponse: AxiosResponse = {
        data: mockCustomers,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.findAll();

      expect(result[0]).toHaveProperty('id', 'customer-1');
      expect(result[0]).toHaveProperty('name', 'Ferretería Shama');
      expect(result[0]).toHaveProperty('nit', '1234567890123');
      expect(result[0]).toHaveProperty('address', 'Zona 1, Guatemala');
      expect(result[0]).toHaveProperty('email', 'ventas@shama.com');
    });
  });

  describe('create', () => {
    it('should create customer via CRM service', async () => {
      const createDto = {
        name: 'Nueva Empresa S.A.',
        nit: '456789123',
        address: 'Boulevard Los Próceres',
        email: 'contacto@nuevaempresa.com',
      };

      const mockCreatedCustomer = {
        id: 'customer-3',
        name: 'Nueva Empresa S.A.',
        nit: '456789123',
        address: 'Boulevard Los Próceres',
        email: 'contacto@nuevaempresa.com',
        createdAt: '2024-01-15T10:00:00Z',
      };

      const mockResponse: AxiosResponse = {
        data: mockCreatedCustomer,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await controller.create(createDto);

      expect(mockHttpService.post).toHaveBeenCalledWith('http://crm-svc:5002/api/v1/customers', createDto);
      expect(result).toEqual(mockCreatedCustomer);
    });

    it('should handle creation errors', async () => {
      const createDto = {
        name: 'Empresa Duplicada',
        nit: 'DUPLICATE_NIT',
        address: 'Dirección',
        email: 'test@test.com',
      };

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Customer NIT already exists')));

      await expect(controller.create(createDto)).rejects.toThrow('Customer NIT already exists');
    });

    it('should validate input data', async () => {
      const invalidDto = {
        name: '',
        nit: 'INVALID',
        address: '',
        email: 'invalid-email',
      };

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Invalid customer data')));

      await expect(controller.create(invalidDto)).rejects.toThrow('Invalid customer data');
    });

    it('should handle special characters in customer data', async () => {
      const createDto = {
        name: 'Compañía Pérez & Hijos S.A.',
        nit: '123456789',
        address: 'Calle Principal #123, Zona 1',
        email: 'info@companiperez.com',
      };

      const mockCreatedCustomer = {
        id: 'customer-4',
        ...createDto,
        createdAt: '2024-01-15T10:00:00Z',
      };

      const mockResponse: AxiosResponse = {
        data: mockCreatedCustomer,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await controller.create(createDto);

      expect(result.name).toBe('Compañía Pérez & Hijos S.A.');
      expect(result.address).toBe('Calle Principal #123, Zona 1');
    });
  });
});
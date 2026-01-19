import { Test, TestingModule } from '@nestjs/testing';
import { GetCustomersHandler } from './get-customers.handler';
import { GetCustomersQuery } from '../queries/get-customers.query';
import { Customer } from '../../domain/entities/customer';
import { CustomerRepositoryPort } from '../../domain/ports/customer-repository.port';

describe('GetCustomersHandler', () => {
  let handler: GetCustomersHandler;
  let customerRepository: CustomerRepositoryPort;

  const mockCustomerRepository = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCustomersHandler,
        {
          provide: 'CustomerRepositoryPort',
          useValue: mockCustomerRepository,
        },
      ],
    }).compile();

    handler = module.get<GetCustomersHandler>(GetCustomersHandler);
    customerRepository = module.get<CustomerRepositoryPort>('CustomerRepositoryPort');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return all customers', async () => {
      const mockCustomers: Customer[] = [
        new Customer(
          'customer-1',
          'Empresa ABC S.A.',
          '123456789',
          'Calle Principal 123',
          'contacto@empresaabc.com',
          new Date(),
        ),
        new Customer(
          'customer-2',
          'Compañía XYZ Ltda.',
          '987654321',
          'Avenida Central 456',
          'info@companixyz.com',
          new Date(),
        ),
      ];

      const query = new GetCustomersQuery();
      mockCustomerRepository.findAll.mockResolvedValue(mockCustomers);

      const result = await handler.execute(query);

      expect(mockCustomerRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockCustomers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no customers exist', async () => {
      const query = new GetCustomersQuery();
      mockCustomerRepository.findAll.mockResolvedValue([]);

      const result = await handler.execute(query);

      expect(mockCustomerRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle repository errors', async () => {
      const query = new GetCustomersQuery();
      const error = new Error('Database connection failed');
      mockCustomerRepository.findAll.mockRejectedValue(error);

      await expect(handler.execute(query)).rejects.toThrow('Database connection failed');
      expect(mockCustomerRepository.findAll).toHaveBeenCalled();
    });

    it('should return customers with correct structure', async () => {
      const mockCustomers: Customer[] = [
        new Customer(
          'customer-1',
          'Ferretería El Martillo',
          '123456789012',
          'Zona Industrial, Calle 5',
          'ventas@ferreteria.com',
          new Date(),
        ),
      ];

      const query = new GetCustomersQuery();
      mockCustomerRepository.findAll.mockResolvedValue(mockCustomers);

      const result = await handler.execute(query);

      expect(result[0]).toHaveProperty('id', 'customer-1');
      expect(result[0]).toHaveProperty('name', 'Ferretería El Martillo');
      expect(result[0]).toHaveProperty('nit', '123456789012');
      expect(result[0]).toHaveProperty('address', 'Zona Industrial, Calle 5');
      expect(result[0]).toHaveProperty('email', 'ventas@ferreteria.com');
    });

    it('should handle customers with special characters in names', async () => {
      const mockCustomers: Customer[] = [
        new Customer(
          'customer-1',
          'Compañía Pérez & Hijos S.A.',
          '123456789',
          'Calle Principal 123',
          'info@companiperez.com',
          new Date(),
        ),
      ];

      const query = new GetCustomersQuery();
      mockCustomerRepository.findAll.mockResolvedValue(mockCustomers);

      const result = await handler.execute(query);

      expect(result[0].name).toBe('Compañía Pérez & Hijos S.A.');
    });
  });
});
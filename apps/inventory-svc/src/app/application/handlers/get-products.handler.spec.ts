import { Test, TestingModule } from '@nestjs/testing';
import { GetProductsHandler } from './get-products.handler';
import { GetProductsQuery } from '../queries/get-products.query';
import { Product } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product-repository.port';

describe('GetProductsHandler', () => {
  let handler: GetProductsHandler;
  let productRepository: ProductRepositoryPort;

  const mockProductRepository = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductsHandler,
        {
          provide: 'ProductRepositoryPort',
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    handler = module.get<GetProductsHandler>(GetProductsHandler);
    productRepository = module.get<ProductRepositoryPort>('ProductRepositoryPort');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return all products', async () => {
      const mockProducts: Product[] = [
        {
          id: 'product-1',
          sku: 'TEST001',
          name: 'Test Product 1',
          price: 99.99,
          stock: 50,
          createdAt: new Date(),
          updatedAt: undefined,
        },
        {
          id: 'product-2',
          sku: 'TEST002',
          name: 'Test Product 2',
          price: 149.99,
          stock: 25,
          createdAt: new Date(),
          updatedAt: undefined,
        },
      ];

      const query = new GetProductsQuery();
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const result = await handler.execute(query);

      expect(mockProductRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no products exist', async () => {
      const query = new GetProductsQuery();
      mockProductRepository.findAll.mockResolvedValue([]);

      const result = await handler.execute(query);

      expect(mockProductRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle repository errors', async () => {
      const query = new GetProductsQuery();
      const error = new Error('Database connection failed');
      mockProductRepository.findAll.mockRejectedValue(error);

      await expect(handler.execute(query)).rejects.toThrow('Database connection failed');
      expect(mockProductRepository.findAll).toHaveBeenCalled();
    });

    it('should return products with correct structure', async () => {
      const mockProducts: Product[] = [
        {
          id: 'product-1',
          sku: 'TOOL001',
          name: 'Hammer',
          price: 25.50,
          stock: 100,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      const query = new GetProductsQuery();
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const result = await handler.execute(query);

      expect(result[0]).toHaveProperty('id', 'product-1');
      expect(result[0]).toHaveProperty('sku', 'TOOL001');
      expect(result[0]).toHaveProperty('name', 'Hammer');
      expect(result[0]).toHaveProperty('price', 25.50);
      expect(result[0]).toHaveProperty('stock', 100);
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
    });
  });
});
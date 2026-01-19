import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductHandler } from './create-product.handler';
import { CreateProductCommand } from '../commands/create-product.command';
import { Product } from '../../domain/entities/product';

describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  let productRepository: Repository<Product>;

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProductHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    handler = module.get<CreateProductHandler>(CreateProductHandler);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a product successfully', async () => {
      const command = new CreateProductCommand(
        'TEST001',
        'Test Product',
        99.99,
        50,
      );

      const mockProduct = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        50,
        new Date(),
      );

      mockProductRepository.findOne.mockResolvedValue(null); // SKU not exists
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const result = await handler.execute(command);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { sku: 'TEST001' },
      });

      expect(mockProductRepository.create).toHaveBeenCalledWith({
        sku: 'TEST001',
        name: 'Test Product',
        price: 99.99,
        stock: 50,
      });

      expect(mockProductRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw error when SKU already exists', async () => {
      const command = new CreateProductCommand(
        'EXISTING001',
        'New Product',
        49.99,
        25,
      );

      const existingProduct = new Product(
        'existing-uuid',
        'EXISTING001',
        'Existing Product',
        29.99,
        10,
        new Date(),
      );

      mockProductRepository.findOne.mockResolvedValue(existingProduct);

      await expect(handler.execute(command)).rejects.toThrow('Product with SKU EXISTING001 already exists');
    });

    it('should throw error for invalid SKU', async () => {
      const command = new CreateProductCommand(
        '',
        'Test Product',
        99.99,
        50,
      );

      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow('Product SKU is required');
    });

    it('should throw error for invalid name', async () => {
      const command = new CreateProductCommand(
        'TEST001',
        '',
        99.99,
        50,
      );

      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow('Product name is required');
    });

    it('should throw error for negative price', async () => {
      const command = new CreateProductCommand(
        'TEST001',
        'Test Product',
        -10.00,
        50,
      );

      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow('Product price cannot be negative');
    });

    it('should throw error for negative initial stock', async () => {
      const command = new CreateProductCommand(
        'TEST001',
        'Test Product',
        99.99,
        -5,
      );

      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow('Product stock cannot be negative');
    });

    it('should handle repository save error', async () => {
      const command = new CreateProductCommand({
        sku: 'TEST001',
        name: 'Test Product',
        price: 99.99,
        initialStock: 50,
      });

      const mockProduct = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        50,
        new Date(),
      );

      mockProductRepository.findOne.mockResolvedValue(null);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    });

    it('should create product with zero initial stock', async () => {
      const command = new CreateProductCommand(
        'TEST001',
        'Test Product',
        99.99,
        0,
      );

      const mockProduct = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        0,
        new Date(),
      );

      mockProductRepository.findOne.mockResolvedValue(null);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const result = await handler.execute(command);

      expect(result.stock).toBe(0);
    });
  });
});
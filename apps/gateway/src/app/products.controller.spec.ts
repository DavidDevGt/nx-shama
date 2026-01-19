import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { HttpService } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('ProductsController', () => {
  let controller: ProductsController;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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
      controllers: [ProductsController],
      providers: [
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    httpService = module.get<HttpService>(HttpService);

    // Set environment variable for INVENTORY_URL
    process.env.INVENTORY_URL = 'http://inventory-svc:5001';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.INVENTORY_URL;
  });

  describe('findAll', () => {
    it('should return products from inventory service', async () => {
      const mockProducts = [
        { id: '1', sku: 'TOOL001', name: 'Hammer', price: 25.50, stock: 100 },
        { id: '2', sku: 'TOOL002', name: 'Screwdriver', price: 15.00, stock: 50 },
      ];

      const mockResponse: AxiosResponse = {
        data: mockProducts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.findAll();

      expect(mockHttpService.get).toHaveBeenCalledWith('http://inventory-svc:5001/api/v1/products');
      expect(result).toEqual(mockProducts);
    });

    it('should handle empty products list', async () => {
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
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Inventory service unavailable')));

      await expect(controller.findAll()).rejects.toThrow('Inventory service unavailable');
    });

    it('should return products with correct structure', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          sku: 'HAMMER001',
          name: 'Industrial Hammer',
          price: 45.99,
          stock: 25,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockResponse: AxiosResponse = {
        data: mockProducts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.findAll();

      expect(result[0]).toHaveProperty('id', 'product-1');
      expect(result[0]).toHaveProperty('sku', 'HAMMER001');
      expect(result[0]).toHaveProperty('name', 'Industrial Hammer');
      expect(result[0]).toHaveProperty('price', 45.99);
      expect(result[0]).toHaveProperty('stock', 25);
    });
  });

  describe('create', () => {
    it('should create product via inventory service', async () => {
      const createDto = {
        sku: 'TOOL003',
        name: 'Wrench',
        price: 30.00,
        initialStock: 20,
      };

      const mockCreatedProduct = {
        id: 'product-3',
        sku: 'TOOL003',
        name: 'Wrench',
        price: 30.00,
        stock: 20,
      };

      const mockResponse: AxiosResponse = {
        data: mockCreatedProduct,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await controller.create(createDto);

      expect(mockHttpService.post).toHaveBeenCalledWith('http://inventory-svc:5001/api/v1/products', createDto);
      expect(result).toEqual(mockCreatedProduct);
    });

    it('should handle creation errors', async () => {
      const createDto = {
        sku: 'DUPLICATE',
        name: 'Duplicate Product',
        price: 10.00,
        initialStock: 5,
      };

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Product SKU already exists')));

      await expect(controller.create(createDto)).rejects.toThrow('Product SKU already exists');
    });

    it('should validate input data', async () => {
      const invalidDto = {
        sku: '',
        name: 'Invalid Product',
        price: -10,
        initialStock: -5,
      };

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Invalid product data')));

      await expect(controller.create(invalidDto)).rejects.toThrow('Invalid product data');
    });
  });

  describe('updateStock', () => {
    it('should update product stock', async () => {
      const productId = 'product-1';
      const updateDto = {
        adjustment: -5,
        reason: 'Sale',
      };

      const mockUpdatedProduct = {
        id: 'product-1',
        sku: 'TOOL001',
        name: 'Hammer',
        price: 25.50,
        stock: 95, // 100 - 5
      };

      const mockResponse: AxiosResponse = {
        data: mockUpdatedProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.patch.mockReturnValue(of(mockResponse));

      const result = await controller.updateStock(productId, updateDto);

      expect(mockHttpService.patch).toHaveBeenCalledWith(`http://inventory-svc:5001/api/v1/products/${productId}/stock`, updateDto);
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should handle insufficient stock error', async () => {
      const productId = 'product-1';
      const updateDto = {
        adjustment: -200, // More than available
        reason: 'Bulk sale',
      };

      mockHttpService.patch.mockReturnValue(throwError(() => new Error('Insufficient stock: requested 200, available 100')));

      await expect(controller.updateStock(productId, updateDto)).rejects.toThrow('Insufficient stock');
    });

    it('should handle positive stock adjustments', async () => {
      const productId = 'product-1';
      const updateDto = {
        adjustment: 50, // Restock
        reason: 'Restock',
      };

      const mockUpdatedProduct = {
        id: 'product-1',
        sku: 'TOOL001',
        name: 'Hammer',
        price: 25.50,
        stock: 150, // 100 + 50
      };

      const mockResponse: AxiosResponse = {
        data: mockUpdatedProduct,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.patch.mockReturnValue(of(mockResponse));

      const result = await controller.updateStock(productId, updateDto);

      expect(result.stock).toBe(150);
    });
  });
});
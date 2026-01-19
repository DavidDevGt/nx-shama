import { Product } from './product';

describe('Product Entity (Domain Model)', () => {
  describe('Product Creation', () => {
    it('should create a valid product', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        50,
        new Date(),
      );

      expect(product.id).toBe('product-uuid');
      expect(product.sku).toBe('TEST001');
      expect(product.name).toBe('Test Product');
      expect(product.price).toBe(99.99);
      expect(product.stock).toBe(50);
    });

    it('should accept negative values (no validation in constructor)', () => {
      const product = new Product(
        'product-uuid',
        '',
        '',
        -10.00,
        -5,
        new Date(),
      );

      expect(product.price).toBe(-10.00);
      expect(product.stock).toBe(-5);
    });
  });

  describe('Business Logic - updateStock()', () => {
    it('should update stock successfully', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        50,
        new Date(),
      );

      product.updateStock(10);

      expect(product.stock).toBe(60);
    });

    it('should throw error when stock becomes negative', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        5,
        new Date(),
      );

      expect(() => product.updateStock(-10)).toThrow('Insufficient stock');
    });

    it('should allow reducing stock to zero', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        10,
        new Date(),
      );

      product.updateStock(-10);

      expect(product.stock).toBe(0);
    });
  });

  describe('Business Logic - hasStock()', () => {
    it('should return true when stock is sufficient', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        50,
        new Date(),
      );

      expect(product.hasStock(25)).toBe(true);
    });

    it('should return false when stock is insufficient', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        10,
        new Date(),
      );

      expect(product.hasStock(25)).toBe(false);
    });

    it('should return true when stock equals quantity', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        10,
        new Date(),
      );

      expect(product.hasStock(10)).toBe(true);
    });

    it('should return false for zero quantity', () => {
      const product = new Product(
        'product-uuid',
        'TEST001',
        'Test Product',
        99.99,
        50,
        new Date(),
      );

      expect(product.hasStock(0)).toBe(false);
    });
  });
});
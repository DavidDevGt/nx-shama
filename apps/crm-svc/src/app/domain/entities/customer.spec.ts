import { Customer } from './customer';

describe('Customer Entity (Domain Model)', () => {
  describe('Customer Creation', () => {
    it('should create a valid customer', () => {
      const customer = new Customer(
        'customer-uuid',
        'Test Company S.A.',
        '123456789',
        'Test Address 123',
        'contact@testcompany.com',
        new Date(),
      );

      expect(customer.id).toBe('customer-uuid');
      expect(customer.name).toBe('Test Company S.A.');
      expect(customer.nit).toBe('123456789');
      expect(customer.address).toBe('Test Address 123');
      expect(customer.email).toBe('contact@testcompany.com');
    });

    it('should accept empty values (no validation in constructor)', () => {
      const customer = new Customer(
        'customer-uuid',
        '',
        '',
        '',
        '',
        new Date(),
      );

      expect(customer.name).toBe('');
      expect(customer.nit).toBe('');
      expect(customer.address).toBe('');
      expect(customer.email).toBe('');
    });
  });

  describe('Business Logic - updateContactInfo()', () => {
    it('should update contact information successfully', () => {
      const customer = new Customer(
        'customer-uuid',
        'Old Company Name',
        '123456789',
        'Old Address',
        'old@test.com',
        new Date(),
      );

      customer.updateContactInfo('New Company Name', 'New Address 456', 'new@test.com');

      expect(customer.address).toBe('New Address 456');
      expect(customer.email).toBe('new@test.com');
      expect(customer.name).toBe('New Company Name');
      expect(customer.nit).toBe('123456789'); // NIT should not change
    });
  });

  describe('Data Handling', () => {
    it('should handle special characters in name', () => {
      const customer = new Customer(
        'customer-uuid',
        'Compañía Tést S.A. & Sons',
        '123456789',
        'Test Address',
        'contact@test.com',
        new Date(),
      );

      expect(customer.name).toBe('Compañía Tést S.A. & Sons');
    });
  });
});
import { Quotation, QuotationStatus } from './quotation.entity';
import { QuotationItem } from './quotation-item.entity';

describe('Quotation Entity (Domain Model)', () => {
  describe('Quotation Creation', () => {
    it('should create a valid quotation', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 100.50,
        lineItems: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            unitPrice: 50.25,
            productName: 'Test Product'
          }
        ]
      });

      expect(quotation.id).toBe('test-uuid');
      expect(quotation.customerId).toBe('customer-uuid');
      expect(quotation.status).toBe(QuotationStatus.DRAFT);
      expect(quotation.totalAmount).toBe(100.50);
      expect(quotation.lineItems).toHaveLength(1);
    });

    it('should throw error for negative total amount', () => {
      expect(() => {
        new Quotation({
          id: 'test-uuid',
          customerId: 'customer-uuid',
          status: QuotationStatus.DRAFT,
          totalAmount: -50,
          lineItems: []
        });
      }).toThrow('Total amount cannot be negative');
    });
  });

  describe('Business Logic - approve()', () => {
    it('should approve a pending quotation and freeze prices', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.PENDING,
        totalAmount: 100.50,
        lineItems: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            unitPrice: 50.25,
            productName: 'Test Product'
          }
        ]
      });

      quotation.approve();

      expect(quotation.status).toBe(QuotationStatus.SOLD);
      expect(quotation.lineItems[0].unitPriceSnapshot).toBe(50.25);
      expect(quotation.lineItems[0].priceSnapshot).toBe(true);
    });

    it('should throw error when approving non-pending quotation', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 100.50,
        lineItems: []
      });

      expect(() => quotation.approve()).toThrow('Only PENDING quotations can be approved');
    });

    it('should throw error when approving cancelled quotation', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.CANCELLED,
        totalAmount: 100.50,
        lineItems: []
      });

      expect(() => quotation.approve()).toThrow('Only PENDING quotations can be approved');
    });
  });

  describe('Business Logic - cancel()', () => {
    it('should cancel a draft quotation', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 100.50,
        lineItems: []
      });

      quotation.cancel();

      expect(quotation.status).toBe(QuotationStatus.CANCELLED);
    });

    it('should cancel a pending quotation', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.PENDING,
        totalAmount: 100.50,
        lineItems: []
      });

      quotation.cancel();

      expect(quotation.status).toBe(QuotationStatus.CANCELLED);
    });

    it('should throw error when cancelling sold quotation', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.SOLD,
        totalAmount: 100.50,
        lineItems: []
      });

      expect(() => quotation.cancel()).toThrow('Cannot cancel SOLD quotation');
    });
  });

  describe('Business Logic - calculateTotal()', () => {
    it('should calculate total from line items', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 0,
        lineItems: []
      });

      const items: QuotationItem[] = [
        { id: '1', productId: 'p1', quantity: 2, unitPrice: 10.50, productName: 'Product 1' },
        { id: '2', productId: 'p2', quantity: 1, unitPrice: 25.00, productName: 'Product 2' }
      ];

      quotation.lineItems = items;
      const total = quotation.calculateTotal();

      expect(total).toBe(46.00); // (2 * 10.50) + (1 * 25.00)
    });

    it('should return 0 for empty line items', () => {
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 0,
        lineItems: []
      });

      const total = quotation.calculateTotal();
      expect(total).toBe(0);
    });
  });

  describe('Status Transitions', () => {
    it('should allow valid status transitions', () => {
      // DRAFT -> PENDING
      const quotation = new Quotation({
        id: 'test-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 100.50,
        lineItems: []
      });

      // Simulate status change (in real implementation this would be through commands)
      (quotation as any).status = QuotationStatus.PENDING;
      expect(quotation.status).toBe(QuotationStatus.PENDING);

      // PENDING -> SOLD
      (quotation as any).status = QuotationStatus.SOLD;
      expect(quotation.status).toBe(QuotationStatus.SOLD);
    });

    it('should validate status enum values', () => {
      const validStatuses = Object.values(QuotationStatus);

      validStatuses.forEach(status => {
        const quotation = new Quotation({
          id: 'test-uuid',
          customerId: 'customer-uuid',
          status: status as QuotationStatus,
          totalAmount: 100.50,
          lineItems: []
        });

        expect(quotation.status).toBe(status);
      });
    });
  });
});
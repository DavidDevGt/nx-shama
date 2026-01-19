import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApproveQuotationHandler } from './approve-quotation.handler';
import { ApproveQuotationCommand } from '../commands/approve-quotation.command';
import { Quotation, QuotationStatus } from '../quotation.entity';
import { ClientProxy } from '@nestjs/microservices';

describe('ApproveQuotationHandler', () => {
  let handler: ApproveQuotationHandler;
  let quotationRepository: Repository<Quotation>;
  let eventBus: ClientProxy;

  const mockQuotationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockEventBus = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveQuotationHandler,
        {
          provide: getRepositoryToken(Quotation),
          useValue: mockQuotationRepository,
        },
        {
          provide: 'NATS_SERVICE',
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<ApproveQuotationHandler>(ApproveQuotationHandler);
    quotationRepository = module.get<Repository<Quotation>>(getRepositoryToken(Quotation));
    eventBus = module.get<ClientProxy>('NATS_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should approve a pending quotation successfully', async () => {
      const command = new ApproveQuotationCommand({
        quotationId: 'quotation-uuid',
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.PENDING,
        totalAmount: 150.00,
        lineItems: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            unitPrice: 50.00,
            productName: 'Product 1',
          },
          {
            id: 'item-2',
            productId: 'product-2',
            quantity: 1,
            unitPrice: 50.00,
            productName: 'Product 2',
          },
        ],
      });

      const approvedQuotation = new Quotation({
        ...mockQuotation,
        status: QuotationStatus.SOLD,
        lineItems: [
          {
            ...mockQuotation.lineItems[0],
            unitPriceSnapshot: 50.00,
            priceSnapshot: true,
          },
          {
            ...mockQuotation.lineItems[1],
            unitPriceSnapshot: 50.00,
            priceSnapshot: true,
          },
        ],
      });

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);
      mockQuotationRepository.save.mockResolvedValue(approvedQuotation);

      const result = await handler.execute(command);

      expect(mockQuotationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'quotation-uuid' },
        relations: ['lineItems'],
      });

      expect(mockQuotationRepository.save).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('quotation.approved', {
        quotationId: 'quotation-uuid',
        totalAmount: 150.00,
        lineItems: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 50.00,
          },
          {
            productId: 'product-2',
            quantity: 1,
            unitPrice: 50.00,
          },
        ],
        timestamp: expect.any(Date),
      });

      expect(result.status).toBe(QuotationStatus.SOLD);
      expect(result.lineItems[0].priceSnapshot).toBe(true);
      expect(result.lineItems[0].unitPriceSnapshot).toBe(50.00);
    });

    it('should throw error when quotation is not found', async () => {
      const command = new ApproveQuotationCommand({
        quotationId: 'non-existent-uuid',
      });

      mockQuotationRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow('Quotation not found');
    });

    it('should throw error when quotation is not in PENDING status', async () => {
      const command = new ApproveQuotationCommand({
        quotationId: 'quotation-uuid',
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 150.00,
        lineItems: [],
      });

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);

      await expect(handler.execute(command)).rejects.toThrow('Only PENDING quotations can be approved');
    });

    it('should throw error when approving CANCELLED quotation', async () => {
      const command = new ApproveQuotationCommand({
        quotationId: 'quotation-uuid',
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.CANCELLED,
        totalAmount: 150.00,
        lineItems: [],
      });

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);

      await expect(handler.execute(command)).rejects.toThrow('Only PENDING quotations can be approved');
    });

    it('should throw error when approving SOLD quotation', async () => {
      const command = new ApproveQuotationCommand({
        quotationId: 'quotation-uuid',
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.SOLD,
        totalAmount: 150.00,
        lineItems: [],
      });

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);

      await expect(handler.execute(command)).rejects.toThrow('Only PENDING quotations can be approved');
    });

    it('should handle repository save error', async () => {
      const command = new ApproveQuotationCommand({
        quotationId: 'quotation-uuid',
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.PENDING,
        totalAmount: 150.00,
        lineItems: [],
      });

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);
      mockQuotationRepository.save.mockRejectedValue(new Error('Database save failed'));

      await expect(handler.execute(command)).rejects.toThrow('Database save failed');
    });

    it('should emit event with correct line items data', async () => {
      const command = new ApproveQuotationCommand({
        quotationId: 'quotation-uuid',
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.PENDING,
        totalAmount: 200.00,
        lineItems: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            unitPrice: 75.00,
            productName: 'Expensive Product',
          },
        ],
      });

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);
      mockQuotationRepository.save.mockResolvedValue({
        ...mockQuotation,
        status: QuotationStatus.SOLD,
      });

      await handler.execute(command);

      expect(eventBus.emit).toHaveBeenCalledWith('quotation.approved', {
        quotationId: 'quotation-uuid',
        totalAmount: 200.00,
        lineItems: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 75.00,
          },
        ],
        timestamp: expect.any(Date),
      });
    });
  });
});
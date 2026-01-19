import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuotationHandler } from './create-quotation.handler';
import { CreateQuotationCommand } from '../commands/create-quotation.command';
import { Quotation, QuotationStatus } from '../quotation.entity';
import { QuotationItem } from '../quotation-item.entity';
import { ClientProxy } from '@nestjs/microservices';

describe('CreateQuotationHandler', () => {
  let handler: CreateQuotationHandler;
  let quotationRepository: Repository<Quotation>;
  let eventBus: ClientProxy;

  const mockQuotationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEventBus = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateQuotationHandler,
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

    handler = module.get<CreateQuotationHandler>(CreateQuotationHandler);
    quotationRepository = module.get<Repository<Quotation>>(getRepositoryToken(Quotation));
    eventBus = module.get<ClientProxy>('NATS_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a quotation successfully', async () => {
      const command = new CreateQuotationCommand({
        customerId: 'customer-uuid',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
          },
          {
            productId: 'product-2',
            quantity: 1,
          },
        ],
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
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

      mockQuotationRepository.create.mockReturnValue(mockQuotation);
      mockQuotationRepository.save.mockResolvedValue(mockQuotation);

      const result = await handler.execute(command);

      expect(mockQuotationRepository.create).toHaveBeenCalledWith({
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: expect.any(Number),
        lineItems: expect.any(Array),
      });

      expect(mockQuotationRepository.save).toHaveBeenCalledWith(mockQuotation);
      expect(eventBus.emit).toHaveBeenCalledWith('quotation.created', {
        quotationId: 'quotation-uuid',
        customerId: 'customer-uuid',
        totalAmount: 150.00,
        itemCount: 2,
      });

      expect(result).toEqual(mockQuotation);
    });

    it('should throw error when customerId is missing', async () => {
      const command = new CreateQuotationCommand({
        customerId: '',
        items: [],
      });

      await expect(handler.execute(command)).rejects.toThrow('Customer ID is required');
    });

    it('should throw error when items array is empty', async () => {
      const command = new CreateQuotationCommand({
        customerId: 'customer-uuid',
        items: [],
      });

      await expect(handler.execute(command)).rejects.toThrow('At least one item is required');
    });

    it('should throw error when item quantity is invalid', async () => {
      const command = new CreateQuotationCommand({
        customerId: 'customer-uuid',
        items: [
          {
            productId: 'product-1',
            quantity: 0, // Invalid quantity
          },
        ],
      });

      await expect(handler.execute(command)).rejects.toThrow('Item quantity must be greater than 0');
    });

    it('should throw error when productId is missing', async () => {
      const command = new CreateQuotationCommand({
        customerId: 'customer-uuid',
        items: [
          {
            productId: '',
            quantity: 1,
          },
        ],
      });

      await expect(handler.execute(command)).rejects.toThrow('Product ID is required');
    });

    it('should handle repository save error', async () => {
      const command = new CreateQuotationCommand({
        customerId: 'customer-uuid',
        items: [
          {
            productId: 'product-1',
            quantity: 1,
          },
        ],
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 50.00,
        lineItems: [],
      });

      mockQuotationRepository.create.mockReturnValue(mockQuotation);
      mockQuotationRepository.save.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    });

    it('should calculate total amount correctly', async () => {
      const command = new CreateQuotationCommand({
        customerId: 'customer-uuid',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
          },
          {
            productId: 'product-2',
            quantity: 3,
          },
        ],
      });

      const mockQuotation = new Quotation({
        id: 'quotation-uuid',
        customerId: 'customer-uuid',
        status: QuotationStatus.DRAFT,
        totalAmount: 250.00, // 2 * 50 + 3 * 50
        lineItems: [],
      });

      mockQuotationRepository.create.mockReturnValue(mockQuotation);
      mockQuotationRepository.save.mockResolvedValue(mockQuotation);

      await handler.execute(command);

      expect(mockQuotation.calculateTotal).toHaveBeenCalled();
    });
  });
});
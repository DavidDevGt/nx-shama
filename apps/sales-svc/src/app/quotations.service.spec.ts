import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuotationsService } from './quotations.service';
import { Quotation } from './quotation.entity';
import { CreateQuotationCommand } from './commands/create-quotation.command';
import { ApproveQuotationCommand } from './commands/approve-quotation.command';
import { GetQuotationSummaryQuery } from './queries/get-quotation-summary.query';
import { CreateQuotationDto, QuotationSummaryDto } from '@nx-shama/contracts';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let quotationRepository: Repository<Quotation>;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockQueryBus = {
    execute: jest.fn(),
  };

  const mockQuotationRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
        {
          provide: getRepositoryToken(Quotation),
          useValue: mockQuotationRepository,
        },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
    quotationRepository = module.get<Repository<Quotation>>(getRepositoryToken(Quotation));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should execute CreateQuotationCommand and return quotation id', async () => {
      const dto: CreateQuotationDto = {
        customerId: 'customer-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
          },
        ],
      };
      const userId = 'user-1';
      const expectedId = 'quotation-1';

      mockCommandBus.execute.mockResolvedValue(expectedId);

      const result = await service.create(dto, userId);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(new CreateQuotationCommand(dto, userId));
      expect(result).toBe(expectedId);
    });

    it('should handle command execution errors', async () => {
      const dto: CreateQuotationDto = {
        customerId: 'invalid-customer',
        items: [],
      };
      const userId = 'user-1';

      const error = new Error('Customer not found');
      mockCommandBus.execute.mockRejectedValue(error);

      await expect(service.create(dto, userId)).rejects.toThrow('Customer not found');
    });

    it('should pass correct parameters to command', async () => {
      const dto: CreateQuotationDto = {
        customerId: 'customer-1',
        items: [
          {
            productId: 'product-1',
            quantity: 5,
          },
          {
            productId: 'product-2',
            quantity: 3,
          },
        ],
      };
      const userId = 'user-123';
      const expectedId = 'quotation-2';

      mockCommandBus.execute.mockResolvedValue(expectedId);

      const result = await service.create(dto, userId);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          dto,
          userId,
        })
      );
      expect(result).toBe(expectedId);
    });
  });

  describe('approve', () => {
    it('should execute ApproveQuotationCommand', async () => {
      const quotationId = 'quotation-1';
      const userId = 'user-1';

      mockCommandBus.execute.mockResolvedValue(undefined);

      await service.approve(quotationId, userId);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(new ApproveQuotationCommand(quotationId, userId));
    });

    it('should handle approval errors', async () => {
      const quotationId = 'quotation-1';
      const userId = 'user-1';

      const error = new Error('Quotation already approved');
      mockCommandBus.execute.mockRejectedValue(error);

      await expect(service.approve(quotationId, userId)).rejects.toThrow('Quotation already approved');
    });

    it('should pass correct parameters to approve command', async () => {
      const quotationId = 'quotation-123';
      const userId = 'user-456';

      mockCommandBus.execute.mockResolvedValue(undefined);

      await service.approve(quotationId, userId);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          quotationId,
          userId,
        })
      );
    });
  });

  describe('findAll', () => {
    it('should execute GetQuotationSummaryQuery and return quotations', async () => {
      const mockQuotations: QuotationSummaryDto[] = [
        {
          id: 'quotation-1',
          customerName: 'Empresa XYZ',
          status: 'PENDING',
          totalAmount: 1250.00,
          itemCount: 5,
          createdAt: new Date('2024-01-18T00:00:00Z'),
        },
        {
          id: 'quotation-2',
          customerName: 'Compañía ABC',
          status: 'SOLD',
          totalAmount: 850.50,
          itemCount: 3,
          createdAt: new Date('2024-01-17T00:00:00Z'),
        },
      ];

      mockQueryBus.execute.mockResolvedValue(mockQuotations);

      const result = await service.findAll();

      expect(mockQueryBus.execute).toHaveBeenCalledWith(new GetQuotationSummaryQuery());
      expect(result).toEqual(mockQuotations);
    });

    it('should handle empty results', async () => {
      mockQueryBus.execute.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle query execution errors', async () => {
      const error = new Error('Database connection failed');
      mockQueryBus.execute.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should return quotations with correct structure', async () => {
      const mockQuotations: QuotationSummaryDto[] = [
        {
          id: 'quotation-1',
          customerName: 'Ferretería Shama',
          status: 'PENDING',
          totalAmount: 2500.75,
          itemCount: 8,
          createdAt: new Date('2024-01-18T10:30:00Z'),
        },
      ];

      mockQueryBus.execute.mockResolvedValue(mockQuotations);

      const result = await service.findAll();

      expect(result[0]).toHaveProperty('id', 'quotation-1');
      expect(result[0]).toHaveProperty('customerName', 'Ferretería Shama');
      expect(result[0]).toHaveProperty('status', 'PENDING');
      expect(result[0]).toHaveProperty('totalAmount', 2500.75);
      expect(result[0]).toHaveProperty('itemCount', 8);
    });
  });

  describe('findById', () => {
    it('should find quotation by id with relations', async () => {
      const quotationId = 'quotation-1';
      const mockQuotation = {
        id: quotationId,
        customerId: 'customer-1',
        status: 'PENDING',
        totalAmount: 1250.00,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            unitPrice: 25.00,
          },
        ],
      };

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);

      const result = await service.findById(quotationId);

      expect(mockQuotationRepository.findOne).toHaveBeenCalledWith({
        where: { id: quotationId },
        relations: ['items'],
      });
      expect(result).toEqual(mockQuotation);
    });

    it('should return null when quotation not found', async () => {
      const quotationId = 'non-existent';

      mockQuotationRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(quotationId);

      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      const quotationId = 'quotation-1';

      const error = new Error('Database connection failed');
      mockQuotationRepository.findOne.mockRejectedValue(error);

      await expect(service.findById(quotationId)).rejects.toThrow('Database connection failed');
    });

    it('should load quotation with all items', async () => {
      const quotationId = 'quotation-1';
      const mockQuotation = {
        id: quotationId,
        customerId: 'customer-1',
        status: 'SOLD',
        totalAmount: 425.00,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 10,
            unitPrice: 15.00,
          },
          {
            id: 'item-2',
            productId: 'product-2',
            quantity: 5,
            unitPrice: 30.00,
          },
          {
            id: 'item-3',
            productId: 'product-3',
            quantity: 2,
            unitPrice: 100.00,
          },
        ],
      };

      mockQuotationRepository.findOne.mockResolvedValue(mockQuotation);

      const result = await service.findById(quotationId);

      expect(result?.items).toHaveLength(3);
      expect(result?.totalAmount).toBe(425.00);
    });
  });
});
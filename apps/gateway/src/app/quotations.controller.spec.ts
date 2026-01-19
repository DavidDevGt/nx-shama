import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsController } from './quotations.controller';
import { HttpService } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { StreamableFile } from '@nestjs/common';

describe('QuotationsController', () => {
  let controller: QuotationsController;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
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
      controllers: [QuotationsController],
      providers: [
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    controller = module.get<QuotationsController>(QuotationsController);
    httpService = module.get<HttpService>(HttpService);

    // Set environment variable for SALES_URL
    process.env.SALES_URL = 'http://sales-svc:5003';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SALES_URL;
  });

  describe('findAll', () => {
    it('should return quotations from sales service', async () => {
      const mockQuotations = [
        {
          id: 'quotation-1',
          customerName: 'Empresa XYZ',
          status: 'PENDING',
          totalAmount: 1250.00,
          itemCount: 5,
          createdAt: '2024-01-18T00:00:00Z',
        },
        {
          id: 'quotation-2',
          customerName: 'Compañía ABC',
          status: 'SOLD',
          totalAmount: 850.50,
          itemCount: 3,
          createdAt: '2024-01-17T00:00:00Z',
        },
      ];

      const mockResponse: AxiosResponse = {
        data: mockQuotations,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.findAll();

      expect(mockHttpService.get).toHaveBeenCalledWith('http://sales-svc:5003/api/v1/quotations');
      expect(result).toEqual(mockQuotations);
    });

    it('should handle empty quotations list', async () => {
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
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Sales service unavailable')));

      await expect(controller.findAll()).rejects.toThrow('Sales service unavailable');
    });

    it('should return quotations with correct structure', async () => {
      const mockQuotations = [
        {
          id: 'quotation-1',
          customerName: 'Ferretería Shama',
          status: 'PENDING',
          totalAmount: 2500.75,
          itemCount: 8,
          createdAt: '2024-01-18T10:30:00Z',
        },
      ];

      const mockResponse: AxiosResponse = {
        data: mockQuotations,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.findAll();

      expect(result[0]).toHaveProperty('id', 'quotation-1');
      expect(result[0]).toHaveProperty('customerName', 'Ferretería Shama');
      expect(result[0]).toHaveProperty('status', 'PENDING');
      expect(result[0]).toHaveProperty('totalAmount', 2500.75);
      expect(result[0]).toHaveProperty('itemCount', 8);
    });
  });

  describe('create', () => {
    it('should create quotation via sales service', async () => {
      const createDto = {
        customerId: 'customer-1',
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
      };

      const mockCreatedQuotation = {
        id: 'quotation-3',
        customerId: 'customer-1',
        status: 'DRAFT',
        totalAmount: 75.50,
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 25.00,
          },
          {
            productId: 'product-2',
            quantity: 1,
            unitPrice: 25.50,
          },
        ],
        createdAt: '2024-01-18T15:00:00Z',
      };

      const mockResponse: AxiosResponse = {
        data: mockCreatedQuotation,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await controller.create(createDto);

      expect(mockHttpService.post).toHaveBeenCalledWith('http://sales-svc:5003/api/v1/quotations', createDto);
      expect(result).toEqual(mockCreatedQuotation);
    });

    it('should handle creation errors', async () => {
      const createDto = {
        customerId: 'invalid-customer',
        items: [],
      };

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Customer not found')));

      await expect(controller.create(createDto)).rejects.toThrow('Customer not found');
    });

    it('should validate input data', async () => {
      const invalidDto = {
        customerId: '',
        items: [],
      };

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Invalid quotation data')));

      await expect(controller.create(invalidDto)).rejects.toThrow('Invalid quotation data');
    });

    it('should handle complex quotation creation', async () => {
      const createDto = {
        customerId: 'customer-1',
        items: [
          {
            productId: 'product-1',
            quantity: 10,
          },
          {
            productId: 'product-2',
            quantity: 5,
          },
          {
            productId: 'product-3',
            quantity: 2,
          },
        ],
      };

      const mockCreatedQuotation = {
        id: 'quotation-4',
        customerId: 'customer-1',
        status: 'DRAFT',
        totalAmount: 425.00,
        items: [
          {
            productId: 'product-1',
            quantity: 10,
            unitPrice: 15.00,
          },
          {
            productId: 'product-2',
            quantity: 5,
            unitPrice: 30.00,
          },
          {
            productId: 'product-3',
            quantity: 2,
            unitPrice: 100.00,
          },
        ],
        createdAt: '2024-01-18T16:00:00Z',
      };

      const mockResponse: AxiosResponse = {
        data: mockCreatedQuotation,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await controller.create(createDto);

      expect(result.totalAmount).toBe(425.00);
      expect(result.items).toHaveLength(3);
    });
  });

  describe('approve', () => {
    it('should approve quotation via sales service', async () => {
      const quotationId = 'quotation-1';

      const mockApprovedQuotation = {
        id: 'quotation-1',
        status: 'SOLD',
        approvedAt: '2024-01-18T17:00:00Z',
      };

      const mockResponse: AxiosResponse = {
        data: mockApprovedQuotation,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await controller.approve(quotationId);

      expect(mockHttpService.post).toHaveBeenCalledWith('http://sales-svc:5003/api/v1/quotations/quotation-1/approve');
      expect(result).toEqual(mockApprovedQuotation);
    });

    it('should handle approval errors', async () => {
      const quotationId = 'quotation-1';

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Quotation already approved')));

      await expect(controller.approve(quotationId)).rejects.toThrow('Quotation already approved');
    });

    it('should handle non-existent quotation', async () => {
      const quotationId = 'non-existent';

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Quotation not found')));

      await expect(controller.approve(quotationId)).rejects.toThrow('Quotation not found');
    });
  });

  describe('getPdf', () => {
    it('should return PDF stream from sales service', async () => {
      const quotationId = 'quotation-1';
      const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');

      const mockResponse: AxiosResponse = {
        data: mockPdfBuffer,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/pdf',
        },
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.getPdf(quotationId);

      expect(mockHttpService.get).toHaveBeenCalledWith('http://sales-svc:5003/api/v1/quotations/quotation-1/pdf', {
        responseType: 'arraybuffer',
      });
      expect(result).toBeInstanceOf(StreamableFile);
      expect((result as any).options.disposition).toBe('attachment; filename=cotizacion-quotation-1.pdf');
    });

    it('should handle PDF generation errors', async () => {
      const quotationId = 'quotation-1';

      mockHttpService.get.mockReturnValue(throwError(() => new Error('PDF generation failed')));

      await expect(controller.getPdf(quotationId)).rejects.toThrow('PDF generation failed');
    });

    it('should handle non-existent quotation PDF', async () => {
      const quotationId = 'non-existent';

      mockHttpService.get.mockReturnValue(throwError(() => new Error('Quotation not found')));

      await expect(controller.getPdf(quotationId)).rejects.toThrow('Quotation not found');
    });

    it('should return correct filename for PDF', async () => {
      const quotationId = 'quotation-123';
      const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');

      const mockResponse: AxiosResponse = {
        data: mockPdfBuffer,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/pdf',
        },
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await controller.getPdf(quotationId);

      expect((result as any).options.disposition).toBe('attachment; filename=cotizacion-quotation-123.pdf');
    });
  });
});
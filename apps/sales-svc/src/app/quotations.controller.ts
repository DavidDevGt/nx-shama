import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { PdfService } from './pdf.service';
import { CreateQuotationDto } from '@nx-shama/contracts';

@Controller('api/v1/quotations')
export class QuotationsController {
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  create(@Body() createQuotationDto: CreateQuotationDto) {
    // TODO: Get userId from auth
    return this.quotationsService.create(createQuotationDto, 'user-1');
  }

  @Get()
  findAll() {
    return this.quotationsService.findAll();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    // TODO: Get userId from auth
    return this.quotationsService.approve(id, 'user-1');
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string) {
    const quotation = await this.quotationsService.findById(id);
    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // TODO: Get customer data
    const customer = {
      name: 'Cliente Demo',
      nit: '123456789',
      address: 'Dirección Demo',
      email: 'cliente@demo.com',
    };

    const pdfBuffer = await this.pdfService.generateQuotationPdf(quotation, customer);

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename=cotizacion-${id}.pdf`,
    });
  }
}
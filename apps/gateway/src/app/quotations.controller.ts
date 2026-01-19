import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@nx-shama/contracts';
import { HttpService } from '@nestjs/axios';
import { StreamableFile } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Controller('quotations')
@UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  @Get()
  @Roles(Role.SALES, Role.ADMIN, Role.READONLY)
  async findAll() {
    const response = await firstValueFrom(
      this.httpService.get(`${process.env.SALES_URL}/api/v1/quotations`)
    );
    return response.data;
  }

  @Post()
  @Roles(Role.SALES, Role.ADMIN)
  async create(@Body() createQuotationDto: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${process.env.SALES_URL}/api/v1/quotations`, createQuotationDto)
    );
    return response.data;
  }

  @Post(':id/approve')
  @Roles(Role.SALES, Role.ADMIN)
  async approve(@Param('id') id: string) {
    const response = await firstValueFrom(
      this.httpService.post(`${process.env.SALES_URL}/api/v1/quotations/${id}/approve`)
    );
    return response.data;
  }

  @Get(':id/pdf')
  @Roles(Role.SALES, Role.ADMIN, Role.READONLY)
  async getPdf(@Param('id') id: string) {
    const response = await firstValueFrom(
      this.httpService.get(`${process.env.SALES_URL}/api/v1/quotations/${id}/pdf`, {
        responseType: 'arraybuffer'
      })
    );
    return new StreamableFile(Buffer.from(response.data), {
      type: 'application/pdf',
      disposition: `attachment; filename=cotizacion-${id}.pdf`,
    });
  }
}
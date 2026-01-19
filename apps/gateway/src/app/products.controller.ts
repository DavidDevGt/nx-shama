import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@nx-shama/contracts';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('products')
@UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.SALES, Role.READONLY)
  @CacheTTL(300) // 5 minutes
  @CacheKey('products:all')
  async findAll() {
    const response = await firstValueFrom(
      this.httpService.get(`${process.env.INVENTORY_URL}/api/v1/products`)
    );
    return response.data;
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createProductDto: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${process.env.INVENTORY_URL}/api/v1/products`, createProductDto)
    );
    return response.data;
  }

  @Patch(':id/stock')
  @Roles(Role.ADMIN, Role.SALES)
  async updateStock(@Param('id') id: string, @Body() updateStockDto: any) {
    const response = await firstValueFrom(
      this.httpService.patch(`${process.env.INVENTORY_URL}/api/v1/products/${id}/stock`, updateStockDto)
    );
    return response.data;
  }
}
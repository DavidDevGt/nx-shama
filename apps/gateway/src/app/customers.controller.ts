import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@nx-shama/contracts';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('customers')
@UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  @Get()
  @Roles(Role.SALES, Role.ADMIN, Role.READONLY)
  async findAll() {
    const response = await firstValueFrom(
      this.httpService.get(`${process.env.CRM_URL}/api/v1/customers`)
    );
    return response.data;
  }

  @Post()
  @Roles(Role.SALES, Role.ADMIN)
  async create(@Body() createCustomerDto: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${process.env.CRM_URL}/api/v1/customers`, createCustomerDto)
    );
    return response.data;
  }
}
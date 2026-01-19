import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCustomerCommand } from '../../application/commands/create-customer.command';
import { GetCustomersQuery } from '../../application/queries/get-customers.query';
import { CreateCustomerDto } from '@nx-shama/contracts';

@Controller('api/v1/customers')
export class CustomersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.commandBus.execute(
      new CreateCustomerCommand(
        createCustomerDto.name,
        createCustomerDto.nit,
        createCustomerDto.address,
        createCustomerDto.email,
      ),
    );
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.queryBus.execute(new GetCustomersQuery(search));
  }
}
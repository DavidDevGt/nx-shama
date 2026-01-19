import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProductCommand } from '../../application/commands/create-product.command';
import { UpdateStockCommand } from '../../application/commands/update-stock.command';
import { GetProductsQuery } from '../../application/queries/get-products.query';
import { CreateProductDto, UpdateStockDto } from '@nx-shama/contracts';

@Controller('api/v1/products')
export class ProductsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return this.commandBus.execute(
      new CreateProductCommand(
        createProductDto.sku,
        createProductDto.name,
        createProductDto.price,
        createProductDto.initialStock,
      ),
    );
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.queryBus.execute(new GetProductsQuery(search));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement GetProductQuery
    return { id, name: 'Producto Demo', price: 10.0 };
  }

  @Patch(':id/stock')
  async updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.commandBus.execute(
      new UpdateStockCommand(id, updateStockDto.adjustment),
    );
  }
}
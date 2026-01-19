import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateStockCommand } from '../commands/update-stock.command';
import { Product } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product-repository.port';

@CommandHandler(UpdateStockCommand)
export class UpdateStockHandler implements ICommandHandler<UpdateStockCommand> {
  constructor(
    @Inject('ProductRepositoryPort')
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(command: UpdateStockCommand): Promise<Product> {
    const { productId, adjustment } = command;

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    product.updateStock(adjustment);

    return this.productRepository.save(product);
  }
}
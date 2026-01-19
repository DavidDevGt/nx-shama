import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateProductCommand } from '../commands/create-product.command';
import { Product } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product-repository.port';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(
    @Inject('ProductRepositoryPort')
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    const { sku, name, price, initialStock } = command;

    // Check if SKU already exists
    const existingProduct = await this.productRepository.findBySku(sku);
    if (existingProduct) {
      throw new Error('Product with this SKU already exists');
    }

    const product = new Product(
      crypto.randomUUID(),
      sku,
      name,
      price,
      initialStock,
      new Date(),
    );

    return this.productRepository.save(product);
  }
}
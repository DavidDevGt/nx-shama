import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetProductsQuery } from '../queries/get-products.query';
import { Product } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product-repository.port';

@QueryHandler(GetProductsQuery)
export class GetProductsHandler implements IQueryHandler<GetProductsQuery> {
  constructor(
    @Inject('ProductRepositoryPort')
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(query: GetProductsQuery): Promise<Product[]> {
    // TODO: Implement search functionality
    return this.productRepository.findAll();
  }
}
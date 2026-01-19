import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRepositoryPort } from '../../domain/ports/product-repository.port';
import { Product } from '../../domain/entities/product';
import { ProductEntity } from '../../product.entity';

@Injectable()
export class ProductRepositoryAdapter implements ProductRepositoryPort {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async save(product: Product): Promise<Product> {
    const entity = ProductEntity.fromDomain(product);
    const savedEntity = await this.productRepository.save(entity);
    return savedEntity.toDomain();
  }

  async findById(id: string): Promise<Product | null> {
    const entity = await this.productRepository.findOneBy({ id });
    return entity ? entity.toDomain() : null;
  }

  async findAll(): Promise<Product[]> {
    const entities = await this.productRepository.find();
    return entities.map(entity => entity.toDomain());
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const entities = await this.productRepository.findByIds(ids);
    return entities.map(entity => entity.toDomain());
  }

  async findBySku(sku: string): Promise<Product | null> {
    const entity = await this.productRepository.findOneBy({ sku });
    return entity ? entity.toDomain() : null;
  }
}
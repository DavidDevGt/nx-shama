import { Product } from '../entities/product';

export interface ProductRepositoryPort {
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  findByIds(ids: string[]): Promise<Product[]>;
  findBySku(sku: string): Promise<Product | null>;
}
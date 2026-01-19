import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Product as DomainProduct } from './domain/entities/product';

@Entity({ schema: 'inventory' })
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  static fromDomain(product: DomainProduct): ProductEntity {
    const entity = new ProductEntity();
    entity.id = product.id;
    entity.sku = product.sku;
    entity.name = product.name;
    entity.price = product.price;
    entity.stock = product.stock;
    entity.createdAt = product.createdAt;
    entity.updatedAt = product.updatedAt;
    return entity;
  }

  toDomain(): DomainProduct {
    return new DomainProduct(
      this.id,
      this.sku,
      this.name,
      this.price,
      this.stock,
      this.createdAt,
      this.updatedAt,
    );
  }
}
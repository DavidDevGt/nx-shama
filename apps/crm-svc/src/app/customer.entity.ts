import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Customer as DomainCustomer } from './domain/entities/customer';

@Entity({ schema: 'crm' })
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  nit: string;

  @Column()
  address: string;

  @Column()
  email: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  static fromDomain(customer: DomainCustomer): CustomerEntity {
    const entity = new CustomerEntity();
    entity.id = customer.id;
    entity.name = customer.name;
    entity.nit = customer.nit;
    entity.address = customer.address;
    entity.email = customer.email;
    entity.createdAt = customer.createdAt;
    entity.updatedAt = customer.updatedAt;
    return entity;
  }

  toDomain(): DomainCustomer {
    return new DomainCustomer(
      this.id,
      this.name,
      this.nit,
      this.address,
      this.email,
      this.createdAt,
      this.updatedAt,
    );
  }
}
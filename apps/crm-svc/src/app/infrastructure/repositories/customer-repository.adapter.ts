import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRepositoryPort } from '../../domain/ports/customer-repository.port';
import { Customer } from '../../domain/entities/customer';
import { CustomerEntity } from '../../customer.entity';

@Injectable()
export class CustomerRepositoryAdapter implements CustomerRepositoryPort {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  async save(customer: Customer): Promise<Customer> {
    const entity = CustomerEntity.fromDomain(customer);
    const savedEntity = await this.customerRepository.save(entity);
    return savedEntity.toDomain();
  }

  async findById(id: string): Promise<Customer | null> {
    const entity = await this.customerRepository.findOneBy({ id });
    return entity ? entity.toDomain() : null;
  }

  async findAll(): Promise<Customer[]> {
    const entities = await this.customerRepository.find();
    return entities.map(entity => entity.toDomain());
  }

  async findByNit(nit: string): Promise<Customer | null> {
    const entity = await this.customerRepository.findOneBy({ nit });
    return entity ? entity.toDomain() : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const entity = await this.customerRepository.findOneBy({ email });
    return entity ? entity.toDomain() : null;
  }
}
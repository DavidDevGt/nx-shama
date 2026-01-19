import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetCustomersQuery } from '../queries/get-customers.query';
import { Customer } from '../../domain/entities/customer';
import { CustomerRepositoryPort } from '../../domain/ports/customer-repository.port';

@QueryHandler(GetCustomersQuery)
export class GetCustomersHandler implements IQueryHandler<GetCustomersQuery> {
  constructor(
    @Inject('CustomerRepositoryPort')
    private readonly customerRepository: CustomerRepositoryPort,
  ) {}

  async execute(query: GetCustomersQuery): Promise<Customer[]> {
    // TODO: Implement search functionality
    return this.customerRepository.findAll();
  }
}
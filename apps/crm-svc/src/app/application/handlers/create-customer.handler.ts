import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateCustomerCommand } from '../commands/create-customer.command';
import { Customer } from '../../domain/entities/customer';
import { CustomerRepositoryPort } from '../../domain/ports/customer-repository.port';

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerHandler implements ICommandHandler<CreateCustomerCommand> {
  constructor(
    @Inject('CustomerRepositoryPort')
    private readonly customerRepository: CustomerRepositoryPort,
  ) {}

  async execute(command: CreateCustomerCommand): Promise<Customer> {
    const { name, nit, address, email } = command;

    // Check if NIT already exists
    const existingCustomer = await this.customerRepository.findByNit(nit);
    if (existingCustomer) {
      throw new Error('Customer with this NIT already exists');
    }

    // Check if email already exists
    const existingEmail = await this.customerRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Customer with this email already exists');
    }

    const customer = new Customer(
      crypto.randomUUID(),
      name,
      nit,
      address,
      email,
      new Date(),
    );

    return this.customerRepository.save(customer);
  }
}
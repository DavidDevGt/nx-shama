import { Customer } from '../entities/customer';

export interface CustomerRepositoryPort {
  save(customer: Customer): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findAll(): Promise<Customer[]>;
  findByNit(nit: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
}
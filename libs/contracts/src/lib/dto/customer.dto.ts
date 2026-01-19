export class CreateCustomerDto {
  constructor(
    public name: string,
    public nit: string,
    public address: string,
    public email: string,
  ) {}
}

export class CustomerDto {
  constructor(
    public id: string,
    public name: string,
    public nit: string,
    public address: string,
    public email: string,
  ) {}
}
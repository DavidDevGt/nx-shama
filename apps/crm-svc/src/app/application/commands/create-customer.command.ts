export class CreateCustomerCommand {
  constructor(
    public readonly name: string,
    public readonly nit: string,
    public readonly address: string,
    public readonly email: string,
  ) {}
}
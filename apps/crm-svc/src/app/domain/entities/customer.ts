export class Customer {
  constructor(
    public readonly id: string,
    public name: string,
    public nit: string,
    public address: string,
    public email: string,
    public readonly createdAt: Date,
    public updatedAt?: Date,
  ) {}

  updateContactInfo(name: string, address: string, email: string): void {
    this.name = name;
    this.address = address;
    this.email = email;
    this.updatedAt = new Date();
  }
}
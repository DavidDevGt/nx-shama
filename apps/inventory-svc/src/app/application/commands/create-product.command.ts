export class CreateProductCommand {
  constructor(
    public readonly sku: string,
    public readonly name: string,
    public readonly price: number,
    public readonly initialStock: number,
  ) {}
}
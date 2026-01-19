export class Product {
  constructor(
    public readonly id: string,
    public sku: string,
    public name: string,
    public price: number,
    public stock: number,
    public readonly createdAt: Date,
    public updatedAt?: Date,
  ) {}

  updateStock(adjustment: number): void {
    const newStock = this.stock + adjustment;
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }
    this.stock = newStock;
    this.updatedAt = new Date();
  }

  hasStock(quantity: number): boolean {
    return this.stock >= quantity;
  }
}
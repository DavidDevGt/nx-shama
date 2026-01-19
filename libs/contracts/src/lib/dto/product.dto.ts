export class CreateProductDto {
  constructor(
    public sku: string,
    public name: string,
    public price: number,
    public initialStock: number,
  ) {}
}

export class UpdateStockDto {
  constructor(
    public adjustment: number,
    public reason: string,
  ) {}
}

export class ProductDto {
  constructor(
    public id: string,
    public sku: string,
    public name: string,
    public price: number,
    public stock: number,
  ) {}
}
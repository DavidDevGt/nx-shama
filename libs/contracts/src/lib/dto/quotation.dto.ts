export enum QuotationStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SOLD = 'SOLD',
  CANCELLED = 'CANCELLED',
}

export class QuotationItemDto {
  constructor(
    public productId: string,
    public quantity: number,
  ) {}
}

export class CreateQuotationDto {
  constructor(
    public customerId: string,
    public items: QuotationItemDto[],
  ) {}
}

export class QuotationSummaryDto {
  constructor(
    public id: string,
    public customerName: string,
    public status: string,
    public totalAmount: number,
    public itemCount: number,
    public createdAt: Date,
  ) {}
}

export class QuotationDto {
  constructor(
    public id: string,
    public customerId: string,
    public status: QuotationStatus,
    public totalAmount: number,
    public items: QuotationItemDto[],
    public createdAt: Date,
  ) {}
}
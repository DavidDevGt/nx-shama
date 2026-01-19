export class QuotationApprovedLineItem {
  constructor(
    public productId: string,
    public quantity: number,
    public unitPrice: number,
  ) {}
}

export class QuotationApprovedEvent {
  constructor(
    public quotationId: string,
    public totalAmount: number,
    public timestamp: number,
    public lineItems: QuotationApprovedLineItem[],
  ) {}
}
export class GetQuotationSummaryQuery {
  constructor(
    public readonly filters: any = {},
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}